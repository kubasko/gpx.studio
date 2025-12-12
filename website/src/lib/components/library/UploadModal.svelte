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

    let { onUpload } = $props<{ onUpload: (data: any) => void }>();

    let open = $state(false);
    let file = $state<File | null>(null);
    let tags = $state('');
    let uploading = $state(false);

    async function handleSubmit() {
        if (!file) return;

        uploading = true;
        const formData = new FormData();
        formData.append('file', file);

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
                file = null;
                tags = '';
            } else {
                alert('Upload failed');
            }
        } catch (e) {
            console.error(e);
            alert('Error uploading file');
        } finally {
            uploading = false;
        }
    }
</script>

<Dialog bind:open>
    <DialogTrigger>
        <Button variant="default">Upload GPX</Button>
    </DialogTrigger>
    <DialogContent class="sm:max-w-[425px]">
        <DialogHeader>
            <DialogTitle>Upload GPX File</DialogTitle>
            <DialogDescription>
                Select a GPX file and add optional tags to organize it.
            </DialogDescription>
        </DialogHeader>
        <div class="grid gap-4 py-4">
            <div class="grid grid-cols-4 items-center gap-4">
                <Label for="file" class="text-right">File</Label>
                <Input
                    id="file"
                    type="file"
                    accept=".gpx"
                    class="col-span-3"
                    onchange={(e) => (file = e.currentTarget.files?.[0] || null)}
                />
            </div>
            <div class="grid grid-cols-4 items-center gap-4">
                <Label for="tags" class="text-right">Tags</Label>
                <Input
                    id="tags"
                    placeholder="hike, mountains, weekend"
                    class="col-span-3"
                    bind:value={tags}
                />
            </div>
        </div>
        <DialogFooter>
            <Button type="submit" onclick={handleSubmit} disabled={!file || uploading}>
                {uploading ? 'Uploading...' : 'Upload'}
            </Button>
        </DialogFooter>
    </DialogContent>
</Dialog>
