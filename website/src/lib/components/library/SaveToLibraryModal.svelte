<script lang="ts">
    import { Button } from '$lib/components/ui/button';
    import { Label } from '$lib/components/ui/label';
    import { Input } from '$lib/components/ui/input';
    import * as Dialog from '$lib/components/ui/dialog';
    import * as RadioGroup from '$lib/components/ui/radio-group';
    import { Loader2, Save, Library } from '@lucide/svelte';
    import { getAuthHeaders } from '$lib/auth';
    import { fileStateCollection } from '$lib/logic/file-state';
    import { buildGPX, type GPXFile } from 'gpx';

    // Props
    let {
        open = $bindable(false),
    }: {
        open: boolean;
    } = $props();

    // Types
    type LibraryItem = {
        id: string;
        name: string;
        filename: string;
    };

    type FileEntry = {
        id: string;
        name: string;
    };

    // ============ STATE ============
    // Loading and messages
    let loading = $state(false);
    let successMessage = $state('');
    let errorMessage = $state('');

    // File selection
    let currentFiles = $state<FileEntry[]>([]);
    let selectedFileId = $state<string | null>(null);

    // Save mode
    let saveMode = $state<'new' | 'overwrite'>('new');
    let newFilename = $state('');

    // Library items
    let libraryItems = $state<LibraryItem[]>([]);
    let selectedLibraryItemId = $state<string | null>(null);

    // ============ DERIVED STATE ============
    // Currently selected file entry
    const selectedFile = $derived(
        selectedFileId ? currentFiles.find((f) => f.id === selectedFileId) : null
    );

    // Whether the save button should be enabled
    const canSave = $derived(
        !loading &&
            currentFiles.length > 0 &&
            selectedFileId !== null &&
            (saveMode === 'new' || selectedLibraryItemId !== null)
    );

    // ============ EFFECTS ============
    // Initialize when modal opens
    $effect(() => {
        if (open) {
            resetState();
            refreshFiles();
            fetchLibrary();
        }
    });

    // Auto-select first file when files are loaded and none selected
    $effect(() => {
        if (open && currentFiles.length > 0 && !selectedFileId) {
            selectFile(currentFiles[0].id);
        }
    });

    // ============ ACTIONS ============
    function resetState() {
        loading = false;
        successMessage = '';
        errorMessage = '';
        selectedFileId = null;
        selectedLibraryItemId = null;
        newFilename = '';
        saveMode = 'new';
    }

    function refreshFiles() {
        const files: FileEntry[] = [];
        fileStateCollection.forEach((fileId, file) => {
            files.push({
                id: fileId,
                name: file.metadata.name || `File ${fileId}`,
            });
        });
        currentFiles = files;
    }

    async function fetchLibrary() {
        try {
            const res = await fetch('/api/library');
            libraryItems = await res.json();
        } catch {
            libraryItems = [];
        }
    }

    function generateNewFilename(baseName: string): string {
        const nameWithoutExt = baseName.replace(/\.gpx$/i, '');
        const timestamp = new Date().toISOString().slice(0, 10);
        return `${nameWithoutExt}_${timestamp}.gpx`;
    }

    function selectFile(fileId: string) {
        selectedFileId = fileId;
        const file = currentFiles.find((f) => f.id === fileId);
        if (file) {
            newFilename = generateNewFilename(file.name);
        }
    }

    function selectLibraryItem(itemId: string) {
        selectedLibraryItemId = itemId;
    }

    async function handleSave() {
        if (!selectedFileId || !selectedFile) return;

        loading = true;
        errorMessage = '';
        successMessage = '';

        try {
            // Determine the saved name
            const savedName = getSavedName();

            // Get fresh file reference and build GPX with temporary name change
            const gpxContent = buildGpxWithName(selectedFileId, savedName);
            if (!gpxContent) {
                errorMessage = 'File not found';
                return;
            }

            // Prepare form data
            const formData = new FormData();
            formData.append('content', gpxContent);

            if (saveMode === 'overwrite' && selectedLibraryItemId) {
                formData.append('mode', 'overwrite');
                formData.append('itemId', selectedLibraryItemId);
                const libraryItem = libraryItems.find((i) => i.id === selectedLibraryItemId);
                formData.append('filename', libraryItem?.name || selectedFile.name);
            } else {
                formData.append('mode', 'new');
                formData.append('filename', newFilename || selectedFile.name + '.gpx');
            }

            // Send to API
            const res = await fetch('/api/library/save', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: formData,
            });

            const data = await res.json();

            if (res.ok) {
                successMessage =
                    saveMode === 'overwrite'
                        ? `Updated "${data.item.name}" in library`
                        : `Saved as new file "${data.item.name}"`;
                // Auto-close after showing success
                setTimeout(() => {
                    open = false;
                }, 1500);
            } else {
                errorMessage = data.error || 'Failed to save';
            }
        } catch {
            errorMessage = 'Failed to save to library';
        } finally {
            loading = false;
        }
    }

    function getSavedName(): string {
        if (saveMode === 'overwrite' && selectedLibraryItemId) {
            const libraryItem = libraryItems.find((i) => i.id === selectedLibraryItemId);
            return (libraryItem?.name || selectedFile?.name || '').replace(/\.gpx$/i, '');
        }
        return (newFilename || selectedFile?.name + '.gpx').replace(/\.gpx$/i, '');
    }

    function buildGpxWithName(fileId: string, newName: string): string | null {
        const file = fileStateCollection.getFile(fileId);
        if (!file) return null;

        // Save original values
        const originalMetaName = file.metadata.name;
        const originalTrackName = file.trk.length === 1 ? file.trk[0].name : null;

        // Temporarily set new name
        file.metadata.name = newName;
        if (file.trk.length === 1) {
            file.trk[0].name = newName;
        }

        // Build GPX content
        const gpxContent = buildGPX(file, []);

        // Restore original values
        file.metadata.name = originalMetaName;
        if (file.trk.length === 1 && originalTrackName !== null) {
            file.trk[0].name = originalTrackName;
        }

        return gpxContent;
    }
</script>

<Dialog.Root bind:open>
    <Dialog.Content class="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
        <Dialog.Header>
            <Dialog.Title class="flex items-center gap-2">
                <Library size="20" />
                Save to Library
            </Dialog.Title>
            <Dialog.Description>Save the current file to your library.</Dialog.Description>
        </Dialog.Header>

        <div class="grid gap-4 py-4">
            {#if currentFiles.length === 0}
                <p class="text-sm text-muted-foreground">No files open to save.</p>
            {:else}
                <!-- File Selection -->
                <div class="grid gap-2">
                    <Label>Select file to save</Label>
                    <div class="flex flex-wrap gap-2">
                        {#each currentFiles as file}
                            <Button
                                variant={selectedFileId === file.id ? 'default' : 'outline'}
                                size="sm"
                                onclick={() => selectFile(file.id)}
                            >
                                {file.name}
                            </Button>
                        {/each}
                    </div>
                </div>

                <!-- Save Mode -->
                <div class="grid gap-2">
                    <Label>Save mode</Label>
                    <RadioGroup.Root bind:value={saveMode}>
                        <div class="flex items-center space-x-2">
                            <RadioGroup.Item value="new" id="mode-new" />
                            <Label for="mode-new" class="font-normal cursor-pointer">
                                Save as new file
                            </Label>
                        </div>
                        <div class="flex items-center space-x-2">
                            <RadioGroup.Item value="overwrite" id="mode-overwrite" />
                            <Label for="mode-overwrite" class="font-normal cursor-pointer">
                                Overwrite existing library file
                            </Label>
                        </div>
                    </RadioGroup.Root>
                </div>

                <!-- New Filename Input -->
                {#if saveMode === 'new'}
                    <div class="grid gap-2">
                        <Label for="filename">Filename</Label>
                        <Input id="filename" bind:value={newFilename} placeholder="my-route.gpx" />
                    </div>
                {:else if saveMode === 'overwrite'}
                    <!-- Library Item Selection -->
                    <div class="grid gap-2">
                        <Label>Select library file to overwrite</Label>
                        {#if libraryItems.length === 0}
                            <p class="text-sm text-muted-foreground">No files in library.</p>
                        {:else}
                            <div class="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
                                {#each libraryItems as item}
                                    <button
                                        type="button"
                                        class="w-full text-left px-2 py-1 rounded text-sm hover:bg-muted transition-colors {selectedLibraryItemId ===
                                        item.id
                                            ? 'bg-primary text-primary-foreground'
                                            : ''}"
                                        onclick={() => selectLibraryItem(item.id)}
                                    >
                                        {item.name}
                                    </button>
                                {/each}
                            </div>
                        {/if}
                    </div>
                {/if}

                <!-- Messages -->
                {#if successMessage}
                    <p class="text-sm text-green-600">{successMessage}</p>
                {/if}
                {#if errorMessage}
                    <p class="text-sm text-destructive">{errorMessage}</p>
                {/if}
            {/if}
        </div>

        <Dialog.Footer>
            <Button variant="outline" onclick={() => (open = false)}>Cancel</Button>
            <Button onclick={handleSave} disabled={!canSave}>
                {#if loading}
                    <Loader2 class="h-4 w-4 animate-spin mr-2" />
                {:else}
                    <Save class="h-4 w-4 mr-2" />
                {/if}
                Save
            </Button>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>
