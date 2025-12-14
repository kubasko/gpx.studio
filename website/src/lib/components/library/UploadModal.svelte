<script lang="ts">
    import { Button } from '$lib/components/ui/button';
    import {
        Dialog,
        DialogContent,
        DialogDescription,
        DialogFooter,
        DialogHeader,
        DialogTitle,
        DialogTrigger,
    } from '$lib/components/ui/dialog';
    import { Input } from '$lib/components/ui/input';
    import { Label } from '$lib/components/ui/label';
    import { i18n } from '$lib/i18n.svelte';
    import { getAuthHeaders } from '$lib/auth';
    import { Plus } from '@lucide/svelte';

    let { onUpload } = $props<{ onUpload: (data: any) => void }>();

    let open = $state(false);
    let name = $state('');
    let file = $state<File | null>(null);
    let tags = $state('');
    let uploading = $state(false);

    async function handleSubmit() {
        if (!name.trim()) return;

        uploading = true;
        const formData = new FormData();
        formData.append('name', name.trim());

        if (file) {
            formData.append('file', file);
        }

        // Split tags by comma and trim
        const tagArray = tags
            .split(',')
            .map((t) => t.trim())
            .filter((t) => t.length > 0);
        formData.append('tags', JSON.stringify(tagArray));

        try {
            const res = await fetch('/api/library', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: formData,
            });

            if (res.ok) {
                const data = await res.json();
                onUpload(data);
                open = false;
                name = '';
                file = null;
                tags = '';
            } else {
                const error = await res.json();
                alert(error.error || 'Failed to add ride');
            }
        } catch (e) {
            console.error(e);
            alert('Error adding ride');
        } finally {
            uploading = false;
        }
    }
</script>

<Dialog bind:open>
    <DialogTrigger>
        <Button variant="default" class="gap-2">
            <Plus size="16" />
            Add Ride
        </Button>
    </DialogTrigger>
    <DialogContent class="sm:max-w-[425px]">
        <DialogHeader>
            <DialogTitle>Add New Ride</DialogTitle>
            <DialogDescription>
                Enter a name for the ride. You can add the GPX file now or later.
            </DialogDescription>
        </DialogHeader>
        <div class="grid gap-4 py-4">
            <div class="grid gap-2">
                <Label for="name">Ride Name *</Label>
                <Input id="name" placeholder="e.g. Mountain Trail 2024" bind:value={name} />
            </div>
            <div class="grid gap-2">
                <Label for="file">GPX File (optional)</Label>
                <Input
                    id="file"
                    type="file"
                    accept=".gpx"
                    onchange={(e) => (file = e.currentTarget.files?.[0] || null)}
                />
                <p class="text-xs text-muted-foreground">
                    You can add or replace the GPX file later from the edit menu.
                </p>
            </div>
            <div class="grid gap-2">
                <Label for="tags">Tags</Label>
                <Input id="tags" placeholder="race, mountains, 2024" bind:value={tags} />
            </div>
        </div>
        <DialogFooter>
            <Button variant="outline" onclick={() => (open = false)}>Cancel</Button>
            <Button type="submit" onclick={handleSubmit} disabled={!name.trim() || uploading}>
                {uploading ? 'Adding...' : 'Add Ride'}
            </Button>
        </DialogFooter>
    </DialogContent>
</Dialog>
