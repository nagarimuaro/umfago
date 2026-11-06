export interface ToastMessage {
	id: number;
	kind: 'success' | 'error' | 'info';
	text: string;
}

class ToastStore {
	items = $state<ToastMessage[]>([]);
	private seq = 1;

	push(kind: ToastMessage['kind'], text: string, ttlMs = 4000) {
		const id = this.seq++;
		this.items = [...this.items, { id, kind, text }];
		setTimeout(() => this.dismiss(id), ttlMs);
	}

	success(text: string) {
		this.push('success', text);
	}

	error(err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		this.push('error', msg, 5500);
	}

	dismiss(id: number) {
		this.items = this.items.filter((t) => t.id !== id);
	}
}

export const toast = new ToastStore();
