<script lang="ts">
    import { onMount } from 'svelte';
    import { Button } from '$lib/components/ui/button';
    import { Input } from '$lib/components/ui/input';
    import { Label } from '$lib/components/ui/label';
    import Logo from '$lib/components/Logo.svelte';
    import type { Snippet } from 'svelte';
    import {
        isPasswordProtectionEnabled,
        validatePassword,
        setAccessLevel,
        hasReadAccess,
        getAccessLevel,
        type AccessLevel,
    } from '$lib/auth';

    let {
        children,
        onAuthenticated = () => {},
    }: {
        children: Snippet;
        onAuthenticated?: () => void;
    } = $props();

    let isAuthenticated = $state(false);
    let password = $state('');
    let error = $state('');
    let isChecking = $state(true);
    let accessLevel = $state<AccessLevel>('none');

    onMount(() => {
        // If no password protection, grant full access
        if (!isPasswordProtectionEnabled()) {
            setAccessLevel('write');
            isAuthenticated = true;
            accessLevel = 'write';
            isChecking = false;
            return;
        }

        // Check if already authenticated
        if (hasReadAccess()) {
            isAuthenticated = true;
            accessLevel = getAccessLevel();
        }
        isChecking = false;
    });

    function handleSubmit(e: Event) {
        e.preventDefault();
        const level = validatePassword(password);

        if (level !== 'none') {
            setAccessLevel(level);
            isAuthenticated = true;
            accessLevel = level;
            error = '';
            onAuthenticated();
        } else {
            error = 'Incorrect password';
        }
    }
</script>

{#if isChecking}
    <!-- Loading state -->
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <div class="animate-pulse">Loading...</div>
    </div>
{:else if !isAuthenticated}
    <!-- Password prompt overlay -->
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-background p-4">
        <div class="w-full max-w-sm space-y-8">
            <div class="flex flex-col items-center gap-2">
                <Logo class="h-12 w-auto" width="96" />
                <h1 class="text-2xl font-bold tracking-tight">Protected Access</h1>
                <p class="text-sm text-muted-foreground">Enter password to continue</p>
            </div>

            <form onsubmit={handleSubmit} class="space-y-4">
                <div class="space-y-2">
                    <Label for="password">Password</Label>
                    <Input
                        type="password"
                        id="password"
                        bind:value={password}
                        placeholder="Enter access password"
                        required
                    />
                </div>

                {#if error}
                    <p class="text-sm text-destructive text-center">{error}</p>
                {/if}

                <Button type="submit" class="w-full">Login</Button>
            </form>
        </div>
    </div>
{:else}
    <!-- Authenticated: show protected content -->
    {@render children()}
{/if}
