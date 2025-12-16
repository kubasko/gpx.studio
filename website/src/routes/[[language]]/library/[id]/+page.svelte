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
        publishDate?: string;
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
        organizers?: { name: string; url: string }[];
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
            distanceMarkers: true,
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
            <!-- Header -->
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div class="flex items-center gap-4 flex-1 min-w-0">
                    <Button href="/library" variant="ghost" size="icon" class="shrink-0">
                        <ArrowLeft size="20" />
                    </Button>
                    <div class="min-w-0">
                        <div class="flex items-center gap-2 flex-wrap">
                            {#if item.category === 'cycling'}
                                <Bike size="20" class="text-blue-500 shrink-0" />
                            {:else if item.category === 'running'}
                                <Footprints size="20" class="text-green-500 shrink-0" />
                            {/if}
                            {#if item.isRace}
                                <Trophy size="20" class="text-amber-500 shrink-0" />
                            {/if}
                            <h1 class="text-xl md:text-2xl font-bold truncate">
                                {getDisplayName(item)}
                            </h1>
                        </div>
                        <p class="text-sm text-muted-foreground">{formatDateRange(item)}</p>
                    </div>
                </div>
                <div class="flex flex-wrap items-center gap-2 md:justify-end">
                    {#if item.filename}
                        <Button
                            variant="outline"
                            onclick={handleDownload}
                            class="flex-1 md:flex-none"
                        >
                            <Download size="16" class="mr-2" />
                            GPX
                        </Button>
                    {/if}
                    {#if item.raceWebpage}
                        <Button
                            variant="outline"
                            href={item.raceWebpage}
                            target="_blank"
                            class="flex-1 md:flex-none"
                        >
                            <ExternalLink size="16" class="mr-2" />
                            Website
                        </Button>
                    {/if}
                    {#if item.raceTrackerUrl}
                        <Button
                            variant="outline"
                            href={item.raceTrackerUrl}
                            target="_blank"
                            class="flex-1 md:flex-none"
                        >
                            <Radio size="16" class="mr-2 text-green-500" />
                            Tracker
                        </Button>
                    {/if}
                    {#if item.raceResultsUrl}
                        <Button
                            variant="outline"
                            href={item.raceResultsUrl}
                            target="_blank"
                            class="flex-1 md:flex-none"
                        >
                            <Medal size="16" class="mr-2 text-amber-500" />
                            Results
                        </Button>
                    {/if}
                </div>
            </div>

            <!-- Hero Section with Image and Stats -->
            <div class="mb-6 rounded-lg border bg-card overflow-hidden">
                <div class="flex flex-col md:flex-row">
                    <!-- Image -->
                    {#if item.image}
                        <div class="w-full md:w-64 h-64 md:h-auto shrink-0">
                            <img
                                src="/api/gpx/images/{item.image}"
                                alt={getDisplayName(item)}
                                class="w-full h-full object-cover"
                            />
                        </div>
                    {/if}

                    <!-- Stats -->
                    <div class="flex-1 p-6">
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {#if item.distance}
                                <div class="text-center p-4 rounded-lg bg-muted/50">
                                    <Route size="24" class="mx-auto mb-2 text-primary" />
                                    <p class="text-2xl font-bold">{item.distance}</p>
                                    <p
                                        class="text-xs text-muted-foreground uppercase tracking-wide"
                                    >
                                        km
                                    </p>
                                </div>
                            {/if}
                            {#if item.elevation}
                                <div class="text-center p-4 rounded-lg bg-muted/50">
                                    <Mountain size="24" class="mx-auto mb-2 text-primary" />
                                    <p class="text-2xl font-bold">{item.elevation}</p>
                                    <p
                                        class="text-xs text-muted-foreground uppercase tracking-wide"
                                    >
                                        m elevation
                                    </p>
                                </div>
                            {/if}
                            {#if item.country}
                                <div class="text-center p-4 rounded-lg bg-muted/50">
                                    <MapPin size="24" class="mx-auto mb-2 text-primary" />
                                    <p class="text-lg font-semibold">{item.country}</p>
                                    <p
                                        class="text-xs text-muted-foreground uppercase tracking-wide"
                                    >
                                        country
                                    </p>
                                </div>
                            {/if}
                            {#if item.isRace}
                                <div
                                    class="text-center p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30"
                                >
                                    <Trophy size="24" class="mx-auto mb-2 text-amber-500" />
                                    <p class="text-lg font-semibold">Race</p>
                                    <p
                                        class="text-xs text-muted-foreground uppercase tracking-wide"
                                    >
                                        {item.category === 'cycling'
                                            ? 'Cycling'
                                            : item.category === 'running'
                                              ? 'Running'
                                              : 'Event'}
                                    </p>
                                </div>
                            {/if}
                        </div>

                        <!-- Tags inline -->
                        <!-- Tags inline (Hidden as per user request)
                        {#if item.tags.length > 0}
                            <div class="flex flex-wrap gap-2 mt-4">
                                {#each item.tags as tag}
                                    <span
                                        class="px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-sm"
                                    >
                                        {tag}
                                    </span>
                                {/each}
                            </div>
                        {/if}
                        -->
                    </div>
                </div>
            </div>

            <!-- Map -->
            {#if item.filename}
                <div class="rounded-lg overflow-hidden border shadow-sm mb-6">
                    <iframe
                        src={getEmbedUrl(item)}
                        width="100%"
                        frameborder="0"
                        style="outline: none;"
                        class="w-full h-[60vh] md:h-[700px]"
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

            <!-- Additional Info -->
            {#if item.description || item.raceTips || (item.mediaLinks && item.mediaLinks.length > 0) || (item.organizers && item.organizers.length > 0)}
                <div class="grid md:grid-cols-2 gap-6">
                    <!-- Left Column: Description and Race Tips -->
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
                    </div>

                    <!-- Right Column: Stories & Movies & Organizers -->
                    <div class="space-y-6">
                        {#if item.organizers && item.organizers.length > 0}
                            <div class="space-y-2">
                                <h3 class="font-semibold">Organizers</h3>
                                <div class="flex flex-col gap-2">
                                    {#each item.organizers as org}
                                        <a
                                            href={org.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            class="flex items-center gap-2 p-3 rounded-lg border hover:bg-muted transition-colors bg-card"
                                        >
                                            <ExternalLink
                                                size="16"
                                                class="text-muted-foreground shrink-0"
                                            />
                                            <span
                                                class="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                                                >{org.name}</span
                                            >
                                        </a>
                                    {/each}
                                </div>
                            </div>
                        {/if}

                        {#if item.mediaLinks && item.mediaLinks.length > 0}
                            <div class="space-y-2">
                                <h3 class="font-semibold">Stories & Movies</h3>
                                <div class="flex flex-col gap-2">
                                    {#each item.mediaLinks.slice().sort((a, b) => {
                                        const dateA = a.publishDate || '';
                                        const dateB = b.publishDate || '';
                                        return dateB.localeCompare(dateA);
                                    }) as link}
                                        <a
                                            href={link.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            class="flex items-center gap-2 p-3 rounded-lg border hover:bg-muted transition-colors"
                                        >
                                            {#if link.type === 'story'}
                                                <BookOpen
                                                    size="16"
                                                    class="text-blue-500 shrink-0"
                                                />
                                            {:else}
                                                <Film size="16" class="text-purple-500 shrink-0" />
                                            {/if}
                                            <span class="truncate flex-1"
                                                >{link.title || link.url}</span
                                            >
                                            {#if link.publishDate}
                                                <span class="text-xs text-muted-foreground shrink-0"
                                                    >{link.publishDate}</span
                                                >
                                            {/if}
                                        </a>
                                    {/each}
                                </div>
                            </div>
                        {/if}
                    </div>
                </div>
            {/if}
        </div>
    {/if}
</div>
