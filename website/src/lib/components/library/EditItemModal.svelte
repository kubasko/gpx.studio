<script lang="ts">
    import { Button } from '$lib/components/ui/button';
    import { Input } from '$lib/components/ui/input';
    import { Label } from '$lib/components/ui/label';
    import { Textarea } from '$lib/components/ui/textarea';
    import { Slider } from '$lib/components/ui/slider';
    import { Switch } from '$lib/components/ui/switch';
    import * as Dialog from '$lib/components/ui/dialog';
    import { i18n } from '$lib/i18n.svelte';
    import { Loader2, Download, Bike, Footprints, Upload, Trash2, ImageIcon } from '@lucide/svelte';
    import { getAuthHeaders } from '$lib/auth';

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

    let {
        open = $bindable(false),
        item,
        onSave,
    }: {
        open: boolean;
        item: LibraryItem;
        onSave: (updated: LibraryItem) => void;
    } = $props();

    let tags = $state('');
    let description = $state('');
    let color = $state('#ff0000');
    let opacity = $state(0.8);
    let width = $state(3);
    let loading = $state(false);

    // Custom name (available for all files)
    let customName = $state('');

    // Activity category
    let category = $state<'cycling' | 'running' | undefined>(undefined);

    // Race attributes
    let isRace = $state(false);
    let raceStartDate = $state('');
    let raceEndDate = $state('');
    let raceWebpage = $state('');
    let raceTips = $state('');

    // Image state
    let image = $state<string | undefined>(undefined);
    let imageSize = $state<'small' | 'medium' | 'large'>('medium');
    let imageUploading = $state(false);
    let imageError = $state('');

    $effect(() => {
        if (open && item) {
            tags = item.tags.join(', ');
            description = item.description || '';
            color = item.style?.color || '#ff0000';
            opacity = item.style?.opacity || 0.8;
            width = item.style?.width || 3;
            customName = item.customName || '';
            category = item.category;
            // Race attributes
            isRace = item.isRace || false;
            raceStartDate = item.raceStartDate || '';
            raceEndDate = item.raceEndDate || '';
            raceWebpage = item.raceWebpage || '';
            raceTips = item.raceTips || '';
            image = item.image;
            imageSize = item.imageSize || 'medium';
            imageError = '';
        }
    });

    async function handleSave() {
        loading = true;
        try {
            const tagList = tags
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean);

            const payload = {
                id: item.id,
                tags: tagList,
                description,
                style: {
                    color,
                    opacity,
                    width,
                },
                customName,
                category,
                isRace,
                raceStartDate,
                raceEndDate,
                raceWebpage,
                raceTips,
                imageSize,
            };

            const res = await fetch('/api/library', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                const updated = await res.json();
                onSave(updated);
                open = false;
            }
        } finally {
            loading = false;
        }
    }

    function handleDownload() {
        const link = document.createElement('a');
        link.href = `/gpx/${item.filename}`;
        link.download = item.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    async function handleImageUpload(e: Event) {
        const input = e.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;

        imageUploading = true;
        imageError = '';

        try {
            const formData = new FormData();
            formData.append('image', file);
            formData.append('itemId', item.id);

            const res = await fetch('/api/library/image', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: formData,
            });

            const data = await res.json();

            if (res.ok) {
                image = data.image;
                onSave(data.item);
            } else {
                imageError = data.error || 'Upload failed';
            }
        } catch (err) {
            imageError = 'Failed to upload image';
        } finally {
            imageUploading = false;
            // Reset input
            input.value = '';
        }
    }

    async function handleImageDelete() {
        if (!image) return;

        imageUploading = true;
        imageError = '';

        try {
            const res = await fetch('/api/library/image', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                body: JSON.stringify({ itemId: item.id }),
            });

            const data = await res.json();

            if (res.ok) {
                image = undefined;
                onSave(data.item);
            } else {
                imageError = data.error || 'Delete failed';
            }
        } catch (err) {
            imageError = 'Failed to delete image';
        } finally {
            imageUploading = false;
        }
    }
</script>

<Dialog.Root bind:open>
    <Dialog.Content class="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
        <Dialog.Header>
            <Dialog.Title>Edit File Details</Dialog.Title>
            <Dialog.Description>
                Update name, tags, description, and ride information.
            </Dialog.Description>
        </Dialog.Header>
        <div class="grid gap-4 py-4">
            <!-- Custom Name (for all files) -->
            <div class="grid gap-2">
                <Label for="customName">Display Name</Label>
                <Input
                    id="customName"
                    bind:value={customName}
                    placeholder="Custom name for this file"
                />
                <p class="text-xs text-muted-foreground">Leave empty to use original filename</p>
            </div>

            <!-- Image Upload -->
            <div class="grid gap-2">
                <Label>Image / Logo</Label>
                {#if image}
                    <div class="relative">
                        <img
                            src="/gpx/images/{image}"
                            alt="Item thumbnail"
                            class="w-full h-32 object-cover rounded-lg border"
                        />
                        <Button
                            variant="destructive"
                            size="icon"
                            class="absolute top-2 right-2 h-7 w-7"
                            onclick={handleImageDelete}
                            disabled={imageUploading}
                        >
                            {#if imageUploading}
                                <Loader2 class="h-4 w-4 animate-spin" />
                            {:else}
                                <Trash2 class="h-4 w-4" />
                            {/if}
                        </Button>
                    </div>
                {:else}
                    <label
                        class="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                    >
                        <div class="flex flex-col items-center justify-center pt-2 pb-2">
                            {#if imageUploading}
                                <Loader2 class="h-8 w-8 text-muted-foreground animate-spin mb-1" />
                                <p class="text-sm text-muted-foreground">Uploading...</p>
                            {:else}
                                <ImageIcon class="h-8 w-8 text-muted-foreground mb-1" />
                                <p class="text-sm text-muted-foreground">Click to upload image</p>
                                <p class="text-xs text-muted-foreground">
                                    JPEG, PNG, GIF, WebP (max 5MB)
                                </p>
                            {/if}
                        </div>
                        <input
                            type="file"
                            class="hidden"
                            accept="image/jpeg,image/png,image/gif,image/webp"
                            onchange={handleImageUpload}
                            disabled={imageUploading}
                        />
                    </label>
                {/if}
                {#if imageError}
                    <p class="text-xs text-destructive">{imageError}</p>
                {/if}
                {#if image}
                    <div class="flex items-center gap-2">
                        <span class="text-sm text-muted-foreground">Size:</span>
                        <div class="flex gap-1">
                            <Button
                                variant={imageSize === 'small' ? 'default' : 'outline'}
                                size="sm"
                                class="h-7 px-2"
                                onclick={() => (imageSize = 'small')}
                            >
                                Small
                            </Button>
                            <Button
                                variant={imageSize === 'medium' ? 'default' : 'outline'}
                                size="sm"
                                class="h-7 px-2"
                                onclick={() => (imageSize = 'medium')}
                            >
                                Medium
                            </Button>
                            <Button
                                variant={imageSize === 'large' ? 'default' : 'outline'}
                                size="sm"
                                class="h-7 px-2"
                                onclick={() => (imageSize = 'large')}
                            >
                                Large
                            </Button>
                        </div>
                    </div>
                {/if}
            </div>

            <!-- Activity Category -->
            <div class="grid gap-2">
                <Label>Activity Type</Label>
                <div class="flex gap-2">
                    <Button
                        variant={category === 'cycling' ? 'default' : 'outline'}
                        onclick={() => (category = category === 'cycling' ? undefined : 'cycling')}
                        class="flex-1 gap-2"
                    >
                        <Bike size="16" />
                        Cycling
                    </Button>
                    <Button
                        variant={category === 'running' ? 'default' : 'outline'}
                        onclick={() => (category = category === 'running' ? undefined : 'running')}
                        class="flex-1 gap-2"
                    >
                        <Footprints size="16" />
                        Running
                    </Button>
                </div>
            </div>

            <!-- Basic Info -->
            <div class="grid gap-2">
                <Label for="tags">Tags</Label>
                <Input id="tags" bind:value={tags} placeholder="comma, separated, tags" />
            </div>

            <div class="grid gap-2">
                <Label for="desc">Description</Label>
                <Textarea
                    id="desc"
                    bind:value={description}
                    placeholder="Enter description..."
                    class="h-20"
                />
            </div>

            <!-- Style Section -->
            <div class="grid gap-2">
                <Label>Display Style</Label>
                <div class="flex items-center gap-4 border rounded-md p-3">
                    <div class="flex flex-col gap-1 items-center">
                        <Label class="text-xs">Color</Label>
                        <Input type="color" bind:value={color} class="h-8 w-14 p-0" />
                    </div>

                    <div class="flex-1 flex flex-col gap-2">
                        <div class="flex justify-between">
                            <Label class="text-xs">Opacity</Label>
                            <span class="text-xs text-muted-foreground"
                                >{Math.round(opacity * 100)}%</span
                            >
                        </div>
                        <Slider bind:value={opacity} min={0.1} max={1} step={0.1} type="single" />

                        <div class="flex justify-between mt-1">
                            <Label class="text-xs">Width</Label>
                            <span class="text-xs text-muted-foreground">{width}px</span>
                        </div>
                        <Slider bind:value={width} min={1} max={10} step={1} type="single" />
                    </div>
                </div>
            </div>

            <!-- Race Section -->
            <div class="border-t pt-4 mt-2">
                <div class="flex items-center justify-between mb-4">
                    <Label for="isRace" class="text-base font-medium">Is this a Race?</Label>
                    <Switch id="isRace" bind:checked={isRace} />
                </div>

                {#if isRace}
                    <div class="grid gap-3 pl-1">
                        <div class="grid grid-cols-2 gap-3">
                            <div class="grid gap-2">
                                <Label for="raceStartDate">Start Date</Label>
                                <Input id="raceStartDate" type="date" bind:value={raceStartDate} />
                            </div>
                            <div class="grid gap-2">
                                <Label for="raceEndDate">End Date</Label>
                                <Input id="raceEndDate" type="date" bind:value={raceEndDate} />
                            </div>
                        </div>

                        <div class="grid gap-2">
                            <Label for="raceWebpage">Race Webpage</Label>
                            <Input
                                id="raceWebpage"
                                type="url"
                                bind:value={raceWebpage}
                                placeholder="https://..."
                            />
                        </div>

                        <div class="grid gap-2">
                            <Label for="raceTips">Race Tips</Label>
                            <Textarea
                                id="raceTips"
                                bind:value={raceTips}
                                placeholder="Any tips for this race..."
                                class="h-24"
                            />
                        </div>
                    </div>
                {/if}
            </div>
        </div>
        <Dialog.Footer>
            <Button variant="outline" onclick={() => (open = false)}>Cancel</Button>
            <Button onclick={handleSave} disabled={loading}>
                {#if loading}<Loader2 class="mr-2 h-4 w-4 animate-spin" />{/if}
                Save Changes
            </Button>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>
