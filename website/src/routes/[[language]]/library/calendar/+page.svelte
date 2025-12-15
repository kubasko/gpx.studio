<script lang="ts">
    import { onMount } from 'svelte';
    import { Button } from '$lib/components/ui/button';
    import {
        ArrowLeft,
        ArrowRight,
        ChevronLeft,
        ChevronRight,
        Bike,
        Footprints,
        Trophy,
        Calendar as CalendarIcon,
        List,
    } from '@lucide/svelte';
    import { getPolishHolidays, type Holiday } from '$lib/utils/holidays';
    import PasswordGate from '$lib/components/PasswordGate.svelte';

    type LibraryItem = {
        id: string;
        name: string;
        filename: string;
        tags: string[];
        description?: string;
        date: string;
        customName?: string;
        category?: 'cycling' | 'running';
        isRace?: boolean;
        raceStartDate?: string;
        raceEndDate?: string;
        raceWebpage?: string;
        distance?: number;
        elevation?: number;
        country?: string;
        image?: string;
    };

    let items = $state<LibraryItem[]>([]);
    let loading = $state(true);
    let currentDate = $state(new Date());
    let viewMode = $state<'month' | 'year'>('month');
    let showHolidays = $state(false);

    onMount(async () => {
        await loadItems();
    });

    async function loadItems() {
        try {
            const res = await fetch('/api/library');
            if (res.ok) {
                const data = await res.json();
                // Filter only items with race dates
                items = data.filter((item: LibraryItem) => item.raceStartDate);
            }
        } catch (e) {
            console.error('Failed to load items', e);
        } finally {
            loading = false;
        }
    }

    // Get display name
    function getDisplayName(item: LibraryItem): string {
        return item.customName?.trim() || item.name;
    }

    // Calendar helpers
    function getDaysInMonth(year: number, month: number): number {
        return new Date(year, month + 1, 0).getDate();
    }

    function getFirstDayOfMonth(year: number, month: number): number {
        return new Date(year, month, 1).getDay();
    }

    function getMonthName(month: number): string {
        return new Date(2000, month, 1).toLocaleString('default', { month: 'long' });
    }

    // Get events for a specific date
    function getEventsForDate(date: Date): LibraryItem[] {
        const dateStr = date.toISOString().split('T')[0];
        return items.filter((item) => {
            if (!item.raceStartDate) return false;
            const startDate = item.raceStartDate;
            const endDate = item.raceEndDate || startDate;
            return dateStr >= startDate && dateStr <= endDate;
        });
    }

    // Get events for a specific month
    function getEventsForMonth(year: number, month: number): LibraryItem[] {
        const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
        return items.filter((item) => {
            if (!item.raceStartDate) return false;
            return item.raceStartDate.startsWith(monthStr);
        });
    }

    function getHolidaysForDate(date: Date): Holiday | undefined {
        if (!showHolidays) return undefined;
        const year = date.getFullYear();
        // Since getPolishHolidays is cheap, we can call it. Optimally we'd cache it.
        const holidays = getPolishHolidays(year);

        // Use local date components to avoid timezone shifts from toISOString()
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        return holidays.find((h) => h.date === dateStr);
    }

    // Navigation
    function prevMonth() {
        currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    }

    function nextMonth() {
        currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    }

    function prevYear() {
        currentDate = new Date(currentDate.getFullYear() - 1, currentDate.getMonth(), 1);
    }

    function nextYear() {
        currentDate = new Date(currentDate.getFullYear() + 1, currentDate.getMonth(), 1);
    }

    function goToToday() {
        currentDate = new Date();
    }

    // Generate calendar grid for month view
    function getCalendarDays() {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonth = getDaysInMonth(year, month);
        const firstDay = getFirstDayOfMonth(year, month);

        // Adjust for Monday start: Sun(0) -> 6, Mon(1) -> 0
        const startDayIndex = (firstDay + 6) % 7;

        const days: (number | null)[] = [];

        // Add empty cells for days before the first of the month
        for (let i = 0; i < startDayIndex; i++) {
            days.push(null);
        }

        // Add days of the month
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(i);
        }

        return days;
    }

    // Check if date is today
    function isToday(day: number): boolean {
        const today = new Date();
        return (
            day === today.getDate() &&
            currentDate.getMonth() === today.getMonth() &&
            currentDate.getFullYear() === today.getFullYear()
        );
    }

    // Derived values
    let calendarDays = $derived(getCalendarDays());
    let monthName = $derived(getMonthName(currentDate.getMonth()));
    let year = $derived(currentDate.getFullYear());
</script>

<svelte:head>
    <title>Race Calendar | Library</title>
</svelte:head>

<PasswordGate>
    <div class="min-h-screen bg-background">
        <div class="container mx-auto py-6 px-4 max-w-6xl">
            <!-- Header -->
            <div class="flex items-center justify-between mb-6">
                <div class="flex items-center gap-4">
                    <Button href="/library" variant="ghost" size="icon">
                        <ArrowLeft size="20" />
                    </Button>
                    <div>
                        <h1 class="text-2xl font-bold flex items-center gap-2">
                            <CalendarIcon size="24" />
                            Race Calendar
                        </h1>
                        <p class="text-sm text-muted-foreground">
                            {items.length} races with dates
                        </p>
                    </div>
                </div>

                <div class="flex items-center gap-2">
                    <Button
                        variant={showHolidays ? 'secondary' : 'outline'}
                        size="sm"
                        onclick={() => (showHolidays = !showHolidays)}
                        title="Toggle Polish public holidays"
                    >
                        🇵🇱 Holidays
                    </Button>
                    <div class="w-px h-6 bg-border mx-1"></div>
                    <Button variant="outline" size="sm" onclick={goToToday}>Today</Button>
                    <Button
                        variant={viewMode === 'month' ? 'default' : 'outline'}
                        size="sm"
                        onclick={() => (viewMode = 'month')}
                    >
                        Month
                    </Button>
                    <Button
                        variant={viewMode === 'year' ? 'default' : 'outline'}
                        size="sm"
                        onclick={() => (viewMode = 'year')}
                    >
                        Year
                    </Button>
                </div>
            </div>

            {#if loading}
                <div class="flex items-center justify-center h-96">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            {:else if viewMode === 'month'}
                <!-- Month View -->
                <div class="rounded-lg border bg-card p-6">
                    <!-- Month Navigation -->
                    <div class="flex items-center justify-between mb-6">
                        <Button variant="ghost" size="icon" onclick={prevMonth}>
                            <ChevronLeft size="20" />
                        </Button>
                        <h2 class="text-xl font-semibold">
                            {monthName}
                            {year}
                        </h2>
                        <Button variant="ghost" size="icon" onclick={nextMonth}>
                            <ChevronRight size="20" />
                        </Button>
                    </div>

                    <!-- Day Headers -->
                    <div class="grid grid-cols-7 gap-1 mb-2">
                        {#each ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as day}
                            <div class="text-center text-sm font-medium text-muted-foreground py-2">
                                {day}
                            </div>
                        {/each}
                    </div>

                    <!-- Calendar Grid -->
                    <div class="grid grid-cols-7 gap-1">
                        {#each calendarDays as day, i}
                            {#if day === null}
                                <div class="h-24 bg-muted/20 rounded"></div>
                            {:else}
                                {@const dateObj = new Date(
                                    currentDate.getFullYear(),
                                    currentDate.getMonth(),
                                    day
                                )}
                                {@const events = getEventsForDate(dateObj)}
                                {@const holiday = getHolidaysForDate(dateObj)}
                                <!-- Weekend shading: i % 7 === 5 (Sat) or 6 (Sun) -->
                                <div
                                    class="h-24 border rounded p-1 overflow-hidden hover:bg-muted/50 transition-colors
                                    {isToday(day) ? 'border-primary border-2' : ''}
                                    {i % 7 === 5 || i % 7 === 6 ? 'bg-muted/60' : ''}"
                                >
                                    <div class="flex justify-between items-start mb-1">
                                        <div
                                            class="text-sm font-medium {isToday(day)
                                                ? 'text-primary'
                                                : holiday
                                                  ? 'text-red-500'
                                                  : 'text-muted-foreground'}"
                                        >
                                            {day}
                                        </div>
                                        {#if holiday}
                                            <div
                                                class="text-[10px] leading-tight text-red-500 text-right font-medium max-w-[70%] truncate"
                                                title={holiday.name}
                                            >
                                                {holiday.name}
                                            </div>
                                        {/if}
                                    </div>

                                    <div class="space-y-0.5 overflow-hidden">
                                        {#each events.slice(0, 2) as event}
                                            <a
                                                href="/library/{event.id}"
                                                target="_blank"
                                                class="block text-xs px-1 py-0.5 rounded truncate hover:opacity-80 {event.category ===
                                                'cycling'
                                                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                                    : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'}"
                                            >
                                                {getDisplayName(event)}
                                            </a>
                                        {/each}
                                        {#if events.length > 2}
                                            <div class="text-xs text-muted-foreground px-1">
                                                +{events.length - 2} more
                                            </div>
                                        {/if}
                                    </div>
                                </div>
                            {/if}
                        {/each}
                    </div>
                </div>
            {:else}
                <!-- Year View -->
                <div class="rounded-lg border bg-card p-6">
                    <!-- Year Navigation -->
                    <div class="flex items-center justify-between mb-6">
                        <Button variant="ghost" size="icon" onclick={prevYear}>
                            <ChevronLeft size="20" />
                        </Button>
                        <h2 class="text-xl font-semibold">{year}</h2>
                        <Button variant="ghost" size="icon" onclick={nextYear}>
                            <ChevronRight size="20" />
                        </Button>
                    </div>

                    <!-- 12 Month Grid -->
                    <div class="grid grid-cols-3 md:grid-cols-4 gap-4">
                        {#each Array(12) as _, month}
                            {@const events = getEventsForMonth(year, month)}
                            <button
                                class="p-4 rounded-lg border hover:bg-muted/50 transition-colors text-left {events.length >
                                0
                                    ? 'border-primary'
                                    : ''}"
                                onclick={() => {
                                    currentDate = new Date(year, month, 1);
                                    viewMode = 'month';
                                }}
                            >
                                <div class="font-medium mb-2">{getMonthName(month)}</div>
                                {#if events.length > 0}
                                    <div class="text-sm text-primary font-semibold">
                                        {events.length} race{events.length > 1 ? 's' : ''}
                                    </div>
                                    <div class="mt-2 space-y-1">
                                        {#each events.slice(0, 3) as event}
                                            <div class="text-xs truncate flex items-center gap-1">
                                                {#if event.category === 'cycling'}
                                                    <Bike
                                                        size="10"
                                                        class="text-blue-500 shrink-0"
                                                    />
                                                {:else}
                                                    <Footprints
                                                        size="10"
                                                        class="text-green-500 shrink-0"
                                                    />
                                                {/if}
                                                <span class="truncate">{getDisplayName(event)}</span
                                                >
                                            </div>
                                        {/each}
                                        {#if events.length > 3}
                                            <div class="text-xs text-muted-foreground">
                                                +{events.length - 3} more
                                            </div>
                                        {/if}
                                    </div>
                                {:else}
                                    <div class="text-sm text-muted-foreground">No races</div>
                                {/if}
                            </button>
                        {/each}
                    </div>
                </div>
            {/if}

            <!-- Upcoming Races List -->
            {#if !loading}
                {@const today = new Date().toISOString().split('T')[0]}
                {@const upcomingRaces = items
                    .filter((i) => i.raceStartDate && i.raceStartDate >= today)
                    .sort((a, b) => (a.raceStartDate || '').localeCompare(b.raceStartDate || ''))
                    .slice(0, 5)}

                {#if upcomingRaces.length > 0}
                    <div class="mt-6 rounded-lg border bg-card p-6">
                        <h3 class="font-semibold mb-4 flex items-center gap-2">
                            <Trophy size="18" class="text-amber-500" />
                            Upcoming Races
                        </h3>
                        <div class="space-y-3">
                            {#each upcomingRaces as race}
                                <a
                                    href="/library/{race.id}"
                                    target="_blank"
                                    class="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                                >
                                    <div class="shrink-0 w-16 text-center">
                                        <div class="text-2xl font-bold">
                                            {new Date(race.raceStartDate + 'T00:00:00').getDate()}
                                        </div>
                                        <div class="text-xs text-muted-foreground uppercase">
                                            {new Date(
                                                race.raceStartDate + 'T00:00:00'
                                            ).toLocaleString('default', { month: 'short' })}
                                        </div>
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <div class="font-medium truncate flex items-center gap-2">
                                            {#if race.category === 'cycling'}
                                                <Bike size="14" class="text-blue-500 shrink-0" />
                                            {:else}
                                                <Footprints
                                                    size="14"
                                                    class="text-green-500 shrink-0"
                                                />
                                            {/if}
                                            {getDisplayName(race)}
                                        </div>
                                        <div class="text-sm text-muted-foreground truncate">
                                            {race.country || ''}
                                            {race.distance ? ` • ${race.distance} km` : ''}
                                        </div>
                                    </div>
                                </a>
                            {/each}
                        </div>
                    </div>
                {/if}
            {/if}
        </div>
    </div>
</PasswordGate>
