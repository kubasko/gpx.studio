<script lang="ts">
    import { page } from '$app/state';
    import { onMount } from 'svelte';
    import { Button } from '$lib/components/ui/button';
    import {
        ArrowLeft,
        Download,
        ExternalLink,
        Calendar,
        MapPin,
        Route,
        Mountain,
        Bike,
        Footprints,
        Trophy,
        Medal,
        Radio,
        BookOpen,
        Film,
    } from '@lucide/svelte';
    import { getAuthHeaders } from '$lib/auth';
    import { PUBLIC_MAPBOX_TOKEN } from '$env/static/public';

    type MediaLink = {
        id: string;
        type: 'story' | 'movie';
        url: string;
        title?: string;
    };

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
        raceResultsUrl?: string;
        raceTrackerUrl?: string;
        image?: string;
        imageSize?: 'small' | 'medium' | 'large';
        mediaLinks?: MediaLink[];
        distance?: number;
        elevation?: number;
        country?: string;
    };

    let item = $state<LibraryItem | null>(null);
    let loading = $state(true);
    let error = $state('');

    const itemId = page.params.id;

    onMount(async () => {
        try {
            const res = await fetch('/api/library');
            if (res.ok) {
                const items = await res.json();
                item = items.find((i: LibraryItem) => i.id === itemId) || null;
                if (!item) {
                    error = 'Item not found';
                }
            } else {
                error = 'Failed to load library';
            }
        } catch (e) {
            error = 'Failed to load item';
        } finally {
            loading = false;
        }
    });

    function getDisplayName(item: LibraryItem): string {
        return item.customName?.trim() || item.name;
    }

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

    function getEmbedUrl(item: LibraryItem): string {
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
        const fileUrl = `${baseUrl}/api/gpx/${item.filename}`;

        const options = {
            token: PUBLIC_MAPBOX_TOKEN,
            files: [fileUrl],
            basemap: 'mapyOutdoor',
        };

        return `${baseUrl}/embed?options=${encodeURIComponent(JSON.stringify(options))}`;
    }

    function handleDownload() {
        if (!item) return;
        const link = document.createElement('a');
        link.href = `/api/gpx/${item.filename}`;
        link.download = item.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
</script>

<svelte:head>
    {#if item}
        <title>{getDisplayName(item)} | Library</title>
    {:else}
        <title>Library Item</title>
    {/if}
</svelte:head>

<div class="min-h-screen bg-background">
    {#if loading}
        <div class="flex items-center justify-center h-screen">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
    {:else if error}
        <div class="flex flex-col items-center justify-center h-screen gap-4">
            <p class="text-destructive">{error}</p>
            <Button href="/library" variant="outline">
                <ArrowLeft size="16" class="mr-2" />
                Back to Library
            </Button>
        </div>
    {:else if item}
        <div class="container mx-auto py-6 px-4 max-w-6xl">
            <!-- Header -->
            <div class="flex items-center gap-4 mb-6">
                <Button href="/library" variant="ghost" size="icon">
                    <ArrowLeft size="20" />
                </Button>
                <div class="flex-1">
                    <div class="flex items-center gap-2">
                        {#if item.category === 'cycling'}
                            <Bike size="20" class="text-blue-500" />
                        {:else if item.category === 'running'}
                            <Footprints size="20" class="text-green-500" />
                        {/if}
                        {#if item.isRace}
                            <Trophy size="20" class="text-amber-500" />
                        {/if}
                        <h1 class="text-2xl font-bold">{getDisplayName(item)}</h1>
                    </div>
                    <p class="text-sm text-muted-foreground">{formatDateRange(item)}</p>
                </div>
                <div class="flex items-center gap-2">
                    {#if item.filename}
                        <Button variant="outline" onclick={handleDownload}>
                            <Download size="16" class="mr-2" />
                            Download GPX
                        </Button>
                    {/if}
                    {#if item.raceWebpage}
                        <Button variant="outline" href={item.raceWebpage} target="_blank">
                            <ExternalLink size="16" class="mr-2" />
                            Race Website
                        </Button>
                    {/if}
                </div>
            </div>

            <!-- Map -->
            {#if item.filename}
                <div class="rounded-lg overflow-hidden border shadow-sm mb-6">
                    <iframe
                        src={getEmbedUrl(item)}
                        width="100%"
                        height="500"
                        frameborder="0"
                        style="outline: none;"
                        title="GPX Map"
                    ></iframe>
                </div>
            {:else}
                <div
                    class="rounded-lg border bg-muted/50 flex items-center justify-center h-64 mb-6"
                >
                    <p class="text-muted-foreground">No GPX file attached</p>
                </div>
            {/if}

            <!-- Info Grid -->
            <div class="grid md:grid-cols-2 gap-6">
                <!-- Left Column: Stats & Image -->
                <div class="space-y-6">
                    <!-- Stats -->
                    <div class="grid grid-cols-2 gap-4">
                        {#if item.distance}
                            <div class="rounded-lg border p-4 bg-card">
                                <div
                                    class="flex items-center gap-2 text-sm text-muted-foreground mb-1"
                                >
                                    <Route size="16" />
                                    Distance
                                </div>
                                <p class="text-2xl font-bold">{item.distance} km</p>
                            </div>
                        {/if}
                        {#if item.elevation}
                            <div class="rounded-lg border p-4 bg-card">
                                <div
                                    class="flex items-center gap-2 text-sm text-muted-foreground mb-1"
                                >
                                    <Mountain size="16" />
                                    Elevation
                                </div>
                                <p class="text-2xl font-bold">{item.elevation} m</p>
                            </div>
                        {/if}
                        {#if item.country}
                            <div class="rounded-lg border p-4 bg-card">
                                <div
                                    class="flex items-center gap-2 text-sm text-muted-foreground mb-1"
                                >
                                    <MapPin size="16" />
                                    Country
                                </div>
                                <p class="text-lg font-semibold">{item.country}</p>
                            </div>
                        {/if}
                    </div>

                    <!-- Image -->
                    {#if item.image}
                        <div class="rounded-lg overflow-hidden border">
                            <img
                                src="/api/gpx/images/{item.image}"
                                alt={getDisplayName(item)}
                                class="w-full h-auto"
                            />
                        </div>
                    {/if}

                    <!-- Tags -->
                    {#if item.tags.length > 0}
                        <div class="space-y-2">
                            <h3 class="font-semibold">Tags</h3>
                            <div class="flex flex-wrap gap-2">
                                {#each item.tags as tag}
                                    <span
                                        class="px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-sm"
                                    >
                                        {tag}
                                    </span>
                                {/each}
                            </div>
                        </div>
                    {/if}
                </div>

                <!-- Right Column: Description, Links -->
                <div class="space-y-6">
                    <!-- Description -->
                    {#if item.description}
                        <div class="space-y-2">
                            <h3 class="font-semibold">Description</h3>
                            <p class="text-muted-foreground whitespace-pre-wrap">
                                {item.description}
                            </p>
                        </div>
                    {/if}

                    <!-- Race Tips -->
                    {#if item.raceTips}
                        <div class="space-y-2">
                            <h3 class="font-semibold flex items-center gap-2">
                                <Trophy size="16" class="text-amber-500" />
                                Race Tips
                            </h3>
                            <div
                                class="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900"
                            >
                                <p class="text-sm whitespace-pre-wrap">{item.raceTips}</p>
                            </div>
                        </div>
                    {/if}

                    <!-- Race Links -->
                    {#if item.raceResultsUrl || item.raceTrackerUrl}
                        <div class="space-y-2">
                            <h3 class="font-semibold">Race Links</h3>
                            <div class="flex flex-col gap-2">
                                {#if item.raceResultsUrl}
                                    <a
                                        href={item.raceResultsUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        class="flex items-center gap-2 p-3 rounded-lg border hover:bg-muted transition-colors"
                                    >
                                        <Medal size="16" class="text-amber-500" />
                                        <span>View Results</span>
                                    </a>
                                {/if}
                                {#if item.raceTrackerUrl}
                                    <a
                                        href={item.raceTrackerUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        class="flex items-center gap-2 p-3 rounded-lg border hover:bg-muted transition-colors"
                                    >
                                        <Radio size="16" class="text-green-500" />
                                        <span>Live Tracker</span>
                                    </a>
                                {/if}
                            </div>
                        </div>
                    {/if}

                    <!-- Media Links -->
                    {#if item.mediaLinks && item.mediaLinks.length > 0}
                        <div class="space-y-2">
                            <h3 class="font-semibold">Stories & Movies</h3>
                            <div class="flex flex-col gap-2">
                                {#each item.mediaLinks as link}
                                    <a
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        class="flex items-center gap-2 p-3 rounded-lg border hover:bg-muted transition-colors"
                                    >
                                        {#if link.type === 'story'}
                                            <BookOpen size="16" class="text-blue-500" />
                                        {:else}
                                            <Film size="16" class="text-purple-500" />
                                        {/if}
                                        <span class="truncate">{link.title || link.url}</span>
                                    </a>
                                {/each}
                            </div>
                        </div>
                    {/if}
                </div>
            </div>
        </div>
    {/if}
</div>
