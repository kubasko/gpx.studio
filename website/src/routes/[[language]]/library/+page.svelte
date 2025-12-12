<script lang="ts">
    import PasswordGate from '$lib/components/PasswordGate.svelte';
    import { onMount, onDestroy } from 'svelte';
    import { goto } from '$app/navigation';
    import { i18n } from '$lib/i18n.svelte';
    import { Button } from '$lib/components/ui/button';
    import { Input } from '$lib/components/ui/input';
    import EditItemModal from '$lib/components/library/EditItemModal.svelte';
    import DetailModal from '$lib/components/library/DetailModal.svelte';
    import UploadModal from '$lib/components/library/UploadModal.svelte';
    import { getURLForLanguage } from '$lib/utils';
    import { page } from '$app/state';
    import {
        Edit2,
        FolderOpen,
        Download,
        Trash2,
        ExternalLink,
        Trophy,
        Bike,
        Footprints,
        Check,
        Copy,
        Eye,
        Share2,
    } from '@lucide/svelte';
    import { getAuthHeaders, hasWriteAccess } from '$lib/auth';
    import * as Dialog from '$lib/components/ui/dialog';

    // Type definition matching the backend
    type LibraryItem = {
        id: string;
        name: string;
        filename: string;
        tags: string[];
        description?: string;
        style?: {
            color?: string;
            opacity?: number;
            width?: number;
        };
        date: string;
        customName?: string;
        category?: 'cycling' | 'running';
        isRace?: boolean;
        raceStartDate?: string;
        raceEndDate?: string;
        raceWebpage?: string;
        raceTips?: string;
        image?: string;
        imageSize?: 'small' | 'medium' | 'large';
    };

    // Get display name - prefer customName if set, otherwise use filename-based name
    function getDisplayName(item: LibraryItem): string {
        return item.customName?.trim() || item.name;
    }

    // Format date range for display
    function formatDateRange(item: LibraryItem): string {
        if (!item.isRace || (!item.raceStartDate && !item.raceEndDate)) {
            return `Added: ${new Date(item.date).toLocaleDateString()}`;
        }
        const start = item.raceStartDate ? new Date(item.raceStartDate).toLocaleDateString() : '';
        const end = item.raceEndDate ? new Date(item.raceEndDate).toLocaleDateString() : '';
        if (start && end) {
            return `${start} - ${end}`;
        }
        return start || end;
    }

    let items = $state<LibraryItem[]>([]);
    let filteredItems = $state<LibraryItem[]>([]);
    let search = $state('');
    let selectedTag = $state<string | null>(null);
    let selectedCategory = $state<'cycling' | 'running' | null>(null);
    let showRacesOnly = $state(false);
    let allTags = $state<string[]>([]);
    let editingItem = $state<LibraryItem | null>(null);
    let isEditing = $state(false);
    let viewingItem = $state<LibraryItem | null>(null);
    let isViewing = $state(false);
    let shareModalOpen = $state(false);
    let sharedLink = $state('');
    let canWrite = $state(false);

    async function fetchLibrary() {
        const res = await fetch('/api/library');
        items = await res.json();
        updateTags();
    }

    function updateTags() {
        const tags = new Set<string>();
        items.forEach((item) => item.tags.forEach((t) => tags.add(t)));
        allTags = Array.from(tags).sort();
    }

    function handleUpload(newItem: LibraryItem) {
        items = [...items, newItem];
        updateTags();
    }

    function handleEditSave(updated: LibraryItem) {
        const idx = items.findIndex((i) => i.id === updated.id);
        if (idx !== -1) items[idx] = updated;
        items = [...items]; // Trigger reactivity
        updateTags();
    }

    $effect(() => {
        let res = items;
        // Category filter
        if (selectedCategory) {
            res = res.filter((i) => i.category === selectedCategory);
        }
        // Races only filter
        if (showRacesOnly) {
            res = res.filter((i) => i.isRace);
        }
        // Tag filter
        if (selectedTag) {
            res = res.filter((i) => i.tags.includes(selectedTag!));
        }
        // Text search - searches all relevant fields
        if (search) {
            const q = search.toLowerCase();
            res = res.filter((i) => {
                return (
                    i.name.toLowerCase().includes(q) ||
                    (i.customName && i.customName.toLowerCase().includes(q)) ||
                    (i.description && i.description.toLowerCase().includes(q)) ||
                    (i.raceTips && i.raceTips.toLowerCase().includes(q)) ||
                    (i.raceWebpage && i.raceWebpage.toLowerCase().includes(q)) ||
                    (i.raceStartDate && i.raceStartDate.includes(q)) ||
                    (i.raceEndDate && i.raceEndDate.includes(q)) ||
                    i.tags.some((t) => t.toLowerCase().includes(q))
                );
            });
        }
        filteredItems = res;
    });

    onMount(() => {
        fetchLibrary();
        canWrite = hasWriteAccess();
    });

    function handleAuthChange() {
        // Re-check write access when authentication changes
        canWrite = hasWriteAccess();
    }

    function getOpenLink(item: LibraryItem) {
        // Use relative path for shorter links
        const fileUrl = `/gpx/${item.filename}`;
        const params = new URLSearchParams();
        params.set('files', JSON.stringify([fileUrl]));

        // Include style metadata if set
        if (item.style) {
            const metadata = {
                [item.filename]: {
                    style: item.style,
                },
            };
            params.set('metadata', JSON.stringify(metadata));
        }

        return getURLForLanguage(i18n.lang, `/app?${params.toString()}`);
    }

    function copyShareLink(item: LibraryItem) {
        const url = getOpenLink(item);
        // Make it absolute if getURLForLanguage returns relative
        const absoluteUrl = new URL(url, page.url.origin).href;
        navigator.clipboard.writeText(absoluteUrl);
        sharedLink = absoluteUrl;
        shareModalOpen = true;
    }

    async function handleDelete(item: LibraryItem) {
        if (!confirm(`Are you sure you want to delete "${item.name}"?`)) {
            return;
        }

        const res = await fetch('/api/library', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
            body: JSON.stringify({ id: item.id }),
        });

        if (res.ok) {
            items = items.filter((i) => i.id !== item.id);
            updateTags();
        } else {
            alert('Failed to delete file');
        }
    }
</script>

<PasswordGate onAuthenticated={handleAuthChange}>
    <div class="container mx-auto py-8 px-4">
        <div class="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
            <h1 class="text-3xl font-bold">Library</h1>
            {#if canWrite}
                <UploadModal onUpload={handleUpload} />
            {/if}
        </div>

        <div class="flex flex-col md:flex-row gap-6">
            <!-- Sidebar / Top bar for filters -->
            <div class="w-full md:w-64 space-y-4 shrink-0">
                <div class="relative">
                    <Input placeholder="Search files..." bind:value={search} />
                </div>

                <!-- Category Filter -->
                <div class="space-y-2">
                    <h3 class="font-semibold mb-2">Activity</h3>
                    <div class="flex gap-2">
                        <Button
                            variant={selectedCategory === 'cycling' ? 'default' : 'outline'}
                            class="flex-1 gap-1"
                            size="sm"
                            onclick={() =>
                                (selectedCategory =
                                    selectedCategory === 'cycling' ? null : 'cycling')}
                        >
                            <Bike size="14" />
                            Cycling
                        </Button>
                        <Button
                            variant={selectedCategory === 'running' ? 'default' : 'outline'}
                            class="flex-1 gap-1"
                            size="sm"
                            onclick={() =>
                                (selectedCategory =
                                    selectedCategory === 'running' ? null : 'running')}
                        >
                            <Footprints size="14" />
                            Running
                        </Button>
                    </div>
                    <Button
                        variant={showRacesOnly ? 'default' : 'outline'}
                        class="w-full gap-1"
                        size="sm"
                        onclick={() => (showRacesOnly = !showRacesOnly)}
                    >
                        <Trophy size="14" />
                        Races Only
                    </Button>
                </div>

                <div class="space-y-2">
                    <h3 class="font-semibold mb-2">Tags</h3>
                    <Button
                        variant={selectedTag === null ? 'default' : 'outline'}
                        class="w-full justify-start"
                        onclick={() => (selectedTag = null)}
                    >
                        All Files
                    </Button>
                    {#each allTags as tag}
                        <div class="flex gap-1">
                            <Button
                                variant={selectedTag === tag ? 'default' : 'outline'}
                                class="grow justify-start capitalize truncate"
                                onclick={() => (selectedTag = tag)}
                                title={tag}
                            >
                                {tag}
                            </Button>
                            {#if selectedTag === tag}
                                <Button
                                    variant="secondary"
                                    size="icon"
                                    title="Open all files with this tag"
                                    onclick={() => {
                                        const urls = filteredItems.map(
                                            (item) => `${page.url.origin}/gpx/${item.filename}`
                                        );
                                        // Serialize metadata for ALL files
                                        const metadata: Record<string, any> = {};
                                        filteredItems.forEach((item) => {
                                            if (item.description || item.style) {
                                                metadata[item.filename] = {
                                                    description: item.description,
                                                    style: item.style,
                                                };
                                            }
                                        });

                                        const params = new URLSearchParams();
                                        params.set('files', JSON.stringify(urls));
                                        if (Object.keys(metadata).length > 0) {
                                            params.set('metadata', JSON.stringify(metadata));
                                        }

                                        goto(
                                            getURLForLanguage(
                                                i18n.lang,
                                                `/app?${params.toString()}`
                                            )
                                        );
                                    }}
                                >
                                    <FolderOpen size="14" />
                                </Button>
                            {/if}
                        </div>
                    {/each}
                </div>
            </div>

            <!-- Grid -->
            <div class="flex-1">
                {#if filteredItems.length === 0}
                    <div class="text-center text-muted-foreground py-12">No files found.</div>
                {:else}
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {#each filteredItems as item}
                            <div
                                class="border rounded-lg shadow-sm hover:shadow-md transition-shadow bg-card flex flex-col overflow-hidden"
                            >
                                {#if item.image}
                                    <img
                                        src="/gpx/images/{item.image}"
                                        alt="{getDisplayName(item)} thumbnail"
                                        class="w-full object-cover {item.imageSize === 'small'
                                            ? 'h-20'
                                            : item.imageSize === 'large'
                                              ? 'h-48'
                                              : 'h-32'}"
                                    />
                                {/if}
                                <div class="p-4 flex-1 flex flex-col">
                                    <div class="flex items-center justify-between mb-1">
                                        <div class="flex items-center gap-2 min-w-0 flex-1">
                                            {#if item.category === 'cycling'}
                                                <Bike
                                                    size="14"
                                                    class="text-blue-500 shrink-0"
                                                    title="Cycling"
                                                />
                                            {:else if item.category === 'running'}
                                                <Footprints
                                                    size="14"
                                                    class="text-green-500 shrink-0"
                                                    title="Running"
                                                />
                                            {/if}
                                            {#if item.isRace}
                                                <Trophy
                                                    size="14"
                                                    class="text-amber-500 shrink-0"
                                                    title="Race"
                                                />
                                            {/if}
                                            <h3
                                                class="font-semibold text-sm truncate"
                                                title={getDisplayName(item)}
                                            >
                                                {getDisplayName(item)}
                                            </h3>
                                        </div>
                                        <div class="flex items-center gap-1 shrink-0">
                                            {#if item.raceWebpage}
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    class="h-6 w-6"
                                                    href={item.raceWebpage}
                                                    target="_blank"
                                                    title="Visit race webpage"
                                                >
                                                    <ExternalLink size="12" />
                                                </Button>
                                            {/if}
                                            {#if canWrite}
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    class="h-6 w-6"
                                                    onclick={() => {
                                                        editingItem = item;
                                                        isEditing = true;
                                                    }}
                                                >
                                                    <Edit2 size="12" />
                                                </Button>
                                            {/if}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                class="h-6 w-6"
                                                onclick={() => {
                                                    const link = document.createElement('a');
                                                    link.href = `/gpx/${item.filename}`;
                                                    link.download = item.name;
                                                    link.click();
                                                }}
                                                title="Download"
                                            >
                                                <Download size="12" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                class="h-6 w-6"
                                                onclick={() => copyShareLink(item)}
                                                title="Share"
                                            >
                                                <Share2 size="12" />
                                            </Button>
                                        </div>
                                    </div>
                                    <p class="text-xs text-muted-foreground mb-3">
                                        {formatDateRange(item)}
                                    </p>

                                    <div class="flex flex-wrap gap-1 mb-4">
                                        {#each item.tags as tag}
                                            <span
                                                class="px-2 py-0.5 bg-secondary text-secondary-foreground text-xs rounded-full"
                                            >
                                                {tag}
                                            </span>
                                        {/each}
                                    </div>

                                    <div class="flex gap-2 mt-auto">
                                        <Button
                                            onclick={() => {
                                                viewingItem = item;
                                                isViewing = true;
                                            }}
                                            class="flex-1"
                                            variant="outline"
                                        >
                                            Info
                                        </Button>
                                        <Button
                                            href={getOpenLink(item)}
                                            class="flex-1"
                                            variant="outline"
                                        >
                                            Open
                                        </Button>
                                        {#if canWrite}
                                            <Button
                                                onclick={() => handleDelete(item)}
                                                size="icon"
                                                variant="destructive"
                                                title="Delete file"
                                            >
                                                <Trash2 size="14" />
                                            </Button>
                                        {/if}
                                    </div>
                                </div>
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>
        </div>

        {#if editingItem}
            <EditItemModal bind:open={isEditing} item={editingItem} onSave={handleEditSave} />
        {/if}
        {#if viewingItem}
            <DetailModal bind:open={isViewing} item={viewingItem} />
        {/if}
    </div>
</PasswordGate>

<!-- Share Link Modal -->
<Dialog.Root bind:open={shareModalOpen}>
    <Dialog.Content class="sm:max-w-[400px]">
        <Dialog.Header>
            <Dialog.Title class="flex items-center gap-2">
                <Check class="h-5 w-5 text-green-500" />
                Link Copied!
            </Dialog.Title>
            <Dialog.Description>
                The share link has been copied to your clipboard.
            </Dialog.Description>
        </Dialog.Header>
        <Dialog.Footer>
            <Button onclick={() => (shareModalOpen = false)}>Close</Button>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>
