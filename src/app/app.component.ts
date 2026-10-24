import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Asset, AssetDraft, AssetKind, AssetStatus } from './models/asset.model';
import { AssetService } from './services/asset.service';

@Component({
  selector: 'po-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  readonly statusFilters: ('Todos' | AssetStatus)[] = ['Todos', 'Operacional', 'Atenção', 'Manutenção', 'Offline'];

  assets: Asset[] = [];
  selectedAsset: Asset | null = null;
  searchTerm = '';
  activeFilter: 'Todos' | AssetStatus = 'Todos';
  isLoading = true;
  loadError = false;
  isFormOpen = false;
  isDeleteOpen = false;
  formSubmitted = false;
  editingAsset: Asset | null = null;
  pendingDelete: Asset | null = null;
  toastMessage = '';
  draft: AssetDraft = this.emptyDraft();

  constructor(private readonly assetService: AssetService) {}

  ngOnInit(): void {
    window.setTimeout(() => this.loadAssets(), 360);
  }

  get filteredAssets(): Asset[] {
    const needle = this.searchTerm.trim().toLowerCase();
    return this.assets.filter((asset) => {
      const matchesFilter = this.activeFilter === 'Todos' || asset.status === this.activeFilter;
      const searchableFields = [asset.name, asset.kind, asset.zone, asset.owner, asset.environment, asset.endpoint];
      const matchesSearch = !needle || searchableFields.some((field) => field.toLowerCase().includes(needle));
      return matchesFilter && matchesSearch;
    });
  }

  get operationalCount(): number {
    return this.assets.filter((asset) => asset.status === 'Operacional').length;
  }

  get attentionCount(): number {
    return this.assets.filter((asset) => asset.status === 'Atenção' || asset.status === 'Manutenção').length;
  }

  get offlineCount(): number {
    return this.assets.filter((asset) => asset.status === 'Offline').length;
  }

  get availabilityLabel(): string {
    if (!this.assets.length) return '—';
    return `${((this.operationalCount / this.assets.length) * 100).toFixed(2).replace('.', ',')}%`;
  }

  get securityScore(): string {
    if (this.offlineCount > 0) return 'C';
    if (this.attentionCount > 0) return 'B';
    return this.assets.length ? 'A+' : '—';
  }

  get hasActiveFilters(): boolean {
    return Boolean(this.searchTerm.trim()) || this.activeFilter !== 'Todos';
  }

  selectAsset(asset: Asset): void {
    this.selectedAsset = asset;
  }

  setFilter(filter: 'Todos' | AssetStatus): void {
    this.activeFilter = filter;
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.activeFilter = 'Todos';
  }

  retryLoad(): void {
    this.loadAssets(300);
  }

  openCreate(): void {
    this.editingAsset = null;
    this.draft = this.emptyDraft();
    this.formSubmitted = false;
    this.isFormOpen = true;
  }

  openEdit(asset: Asset): void {
    this.editingAsset = asset;
    const { id, updatedAt, ...draft } = asset;
    this.draft = draft;
    this.formSubmitted = false;
    this.isFormOpen = true;
  }

  closeForm(): void {
    this.isFormOpen = false;
    this.formSubmitted = false;
  }

  submitAsset(): void {
    this.formSubmitted = true;
    if (!this.draft.name.trim() || !this.draft.zone.trim() || !this.draft.owner.trim()) return;

    const previousAssets = this.assets;
    if (this.editingAsset) {
      const updated: Asset = { ...this.editingAsset, ...this.draft, updatedAt: 'agora' };
      this.assets = this.assets.map((asset) => asset.id === updated.id ? updated : asset);
      this.selectedAsset = updated;
    } else {
      const created = this.assetService.create(this.draft);
      this.assets = [created, ...this.assets];
      this.selectedAsset = created;
    }

    if (!this.persistAssets(previousAssets)) return;
    this.showToast(this.editingAsset ? 'Ativo atualizado no inventário local.' : 'Novo ativo adicionado ao inventário.');
    this.closeForm();
  }

  askDelete(asset: Asset): void {
    this.pendingDelete = asset;
    this.isDeleteOpen = true;
  }

  closeDelete(): void {
    this.isDeleteOpen = false;
    this.pendingDelete = null;
  }

  deleteAsset(): void {
    const pendingDelete = this.pendingDelete;
    if (!pendingDelete) return;
    const removedName = pendingDelete.name;
    const previousAssets = this.assets;
    this.assets = this.assets.filter((asset) => asset.id !== pendingDelete.id);
    if (!this.persistAssets(previousAssets)) return;
    this.selectedAsset = this.assets[0] ?? null;
    this.closeDelete();
    this.showToast(`${removedName} removido do inventário.`);
  }

  resetDemo(): void {
    try {
      this.assetService.reset();
      this.assets = this.assetService.load();
      this.selectedAsset = this.assets[0] ?? null;
      this.clearFilters();
      this.showToast('Dados demonstrativos restaurados.');
    } catch {
      this.showToast('Não foi possível restaurar os dados neste navegador.');
    }
  }

  cssClass(value: string): string {
    return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(' ', '-');
  }

  kindIcon(kind: AssetKind): string {
    const icons: Record<AssetKind, string> = {
      'Distribuição': '↗', 'Computação': '⌘', 'Rede': '⌁', 'Monitoramento': '◌', 'Armazenamento': '▤'
    };
    return icons[kind];
  }

  trackById(_index: number, asset: Asset): string {
    return asset.id;
  }

  @HostListener('document:keydown.escape')
  closeOpenModal(): void {
    if (this.isFormOpen) this.closeForm();
    if (this.isDeleteOpen) this.closeDelete();
  }

  private loadAssets(delay = 0): void {
    this.loadError = false;
    this.isLoading = true;
    window.setTimeout(() => {
      try {
        this.assets = this.assetService.load();
        this.selectedAsset = this.assets[0] ?? null;
      } catch {
        this.loadError = true;
      } finally {
        this.isLoading = false;
      }
    }, delay);
  }

  private persistAssets(previousAssets: Asset[]): boolean {
    try {
      this.assetService.save(this.assets);
      return true;
    } catch {
      this.assets = previousAssets;
      this.selectedAsset = this.assets.find((asset) => asset.id === this.selectedAsset?.id) ?? this.assets[0] ?? null;
      this.showToast('Não foi possível salvar: o armazenamento local está indisponível ou cheio.');
      return false;
    }
  }

  private emptyDraft(): AssetDraft {
    return {
      name: '', kind: 'Computação', status: 'Operacional', environment: 'Produção', zone: '', owner: '',
      description: '', endpoint: ''
    };
  }

  private showToast(message: string): void {
    this.toastMessage = message;
    window.setTimeout(() => this.toastMessage = '', 3200);
  }
}
