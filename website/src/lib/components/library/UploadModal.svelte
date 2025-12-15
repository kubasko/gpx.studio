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
            {i18n._('library.add_ride')}
        </Button>
    </DialogTrigger>
    <DialogContent class="sm:max-w-[425px]">
        <DialogHeader>
            <DialogTitle>{i18n._('library.add_ride')}</DialogTitle>
            <DialogDescription>
                {i18n._('library.add_ride_description')}
            </DialogDescription>
        </DialogHeader>
        <div class="grid gap-4 py-4">
            <div class="grid gap-2">
                <Label for="name">{i18n._('library.ride_name')}</Label>
                <Input
                    id="name"
                    placeholder={i18n._('library.ride_name_placeholder')}
                    bind:value={name}
                />
            </div>
            <div class="grid gap-2">
                <Label for="file">{i18n._('library.gpx_file_optional')}</Label>
                <Input
                    id="file"
                    type="file"
                    accept=".gpx"
                    onchange={(e) => (file = e.currentTarget.files?.[0] || null)}
                />
                <p class="text-xs text-muted-foreground">
                    {i18n._('library.gpx_file_help')}
                </p>
            </div>
            <div class="grid gap-2">
                <Label for="tags">{i18n._('library.tags')}</Label>
                <Input
                    id="tags"
                    placeholder={i18n._('library.tags_placeholder')}
                    bind:value={tags}
                />
            </div>
        </div>
        <DialogFooter>
            <Button variant="outline" onclick={() => (open = false)}
                >{i18n._('docs.search.cancel')}</Button
            >
            <Button type="submit" onclick={handleSubmit} disabled={!name.trim() || uploading}>
                {uploading ? i18n._('library.adding') : i18n._('library.add_ride')}
            </Button>
        </DialogFooter>
    </DialogContent>
</Dialog>
