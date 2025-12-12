<script lang="ts">
    import { Button } from '$lib/components/ui/button';
    import * as Dialog from '$lib/components/ui/dialog';
    import { ExternalLink, Calendar, MapPin, Trophy, Bike, Footprints, Tag } from '@lucide/svelte';

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
    };

    let {
        open = $bindable(false),
        item,
    }: {
        open: boolean;
        item: LibraryItem;
    } = $props();

    function getDisplayName(item: LibraryItem): string {
        return item.customName?.trim() || item.name;
    }

    function formatDate(dateStr: string): string {
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    }

    function formatDateRange(): string {
        if (!item.isRace || (!item.raceStartDate && !item.raceEndDate)) {
            return '';
        }
        const start = item.raceStartDate ? formatDate(item.raceStartDate) : '';
        const end = item.raceEndDate ? formatDate(item.raceEndDate) : '';
        if (start && end && start !== end) {
            return `${start} — ${end}`;
        }
        return start || end;
    }
</script>

<Dialog.Root bind:open>
    <Dialog.Content class="sm:max-w-[600px] max-h-[90vh] overflow-y-auto p-0">
        {#if item.image}
            <div class="relative">
                <img
                    src="/gpx/images/{item.image}"
                    alt={getDisplayName(item)}
                    class="w-full h-48 object-cover"
                />
                <div
                    class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"
                ></div>
                <div class="absolute bottom-4 left-4 right-4">
                    <div class="flex items-center gap-2 mb-1">
                        {#if item.category === 'cycling'}
                            <Bike size="18" class="text-blue-400" />
                        {:else if item.category === 'running'}
                            <Footprints size="18" class="text-green-400" />
                        {/if}
                        {#if item.isRace}
                            <Trophy size="18" class="text-amber-400" />
                        {/if}
                    </div>
                    <h2 class="text-2xl font-bold text-white drop-shadow-lg">
                        {getDisplayName(item)}
                    </h2>
                </div>
            </div>
        {:else}
            <Dialog.Header class="p-6 pb-0">
                <div class="flex items-center gap-2 mb-1">
                    {#if item.category === 'cycling'}
                        <Bike size="18" class="text-blue-500" />
                    {:else if item.category === 'running'}
                        <Footprints size="18" class="text-green-500" />
                    {/if}
                    {#if item.isRace}
                        <Trophy size="18" class="text-amber-500" />
                    {/if}
                </div>
                <Dialog.Title class="text-2xl">{getDisplayName(item)}</Dialog.Title>
            </Dialog.Header>
        {/if}

        <div class="p-6 space-y-4">
            <!-- Date info -->
            {#if item.isRace && formatDateRange()}
                <div class="flex items-center gap-2 text-sm">
                    <Calendar size="16" class="text-muted-foreground" />
                    <span class="font-medium">Race Date:</span>
                    <span>{formatDateRange()}</span>
                </div>
            {:else}
                <div class="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar size="16" />
                    <span>Added: {formatDate(item.date)}</span>
                </div>
            {/if}

            <!-- Race webpage link -->
            {#if item.raceWebpage}
                <div class="flex items-center gap-2">
                    <ExternalLink size="16" class="text-muted-foreground" />
                    <a
                        href={item.raceWebpage}
                        target="_blank"
                        rel="noopener noreferrer"
                        class="text-primary hover:underline text-sm"
                    >
                        {item.raceWebpage}
                    </a>
                </div>
            {/if}

            <!-- Tags -->
            {#if item.tags.length > 0}
                <div class="flex items-start gap-2">
                    <Tag size="16" class="text-muted-foreground mt-0.5" />
                    <div class="flex flex-wrap gap-1">
                        {#each item.tags as tag}
                            <span class="px-2 py-0.5 bg-muted rounded-full text-xs">
                                {tag}
                            </span>
                        {/each}
                    </div>
                </div>
            {/if}

            <!-- Description -->
            {#if item.description}
                <div class="border-t pt-4">
                    <h3 class="font-semibold mb-2">Description</h3>
                    <p class="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                        {item.description}
                    </p>
                </div>
            {/if}

            <!-- Race Tips -->
            {#if item.raceTips}
                <div class="border-t pt-4">
                    <h3 class="font-semibold mb-2 flex items-center gap-2">
                        <Trophy size="16" class="text-amber-500" />
                        Race Tips
                    </h3>
                    <p
                        class="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed bg-amber-50 dark:bg-amber-950/20 p-3 rounded-lg border border-amber-200 dark:border-amber-900"
                    >
                        {item.raceTips}
                    </p>
                </div>
            {/if}
        </div>

        <Dialog.Footer class="p-6 pt-0">
            <Button variant="outline" onclick={() => (open = false)}>Close</Button>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>
