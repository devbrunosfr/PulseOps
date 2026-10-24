import { Injectable } from '@angular/core';
import { Asset, AssetDraft, AssetKind, AssetStatus } from '../models/asset.model';

const STORAGE_KEY = 'pulseops-assets-v1';
const ASSET_KINDS: AssetKind[] = ['Distribuição', 'Computação', 'Rede', 'Monitoramento', 'Armazenamento'];
const ASSET_STATUSES: AssetStatus[] = ['Operacional', 'Atenção', 'Manutenção', 'Offline'];
const ENVIRONMENTS: Asset['environment'][] = ['Produção', 'Staging', 'Laboratório'];

const SEED_ASSETS: Asset[] = [
  {
    id: 'ast-001', name: 'CloudFront Edge', kind: 'Distribuição', status: 'Operacional', environment: 'Produção', zone: 'Global edge', owner: 'Platform', updatedAt: 'há 2 min',
    description: 'Distribuição HTTPS para a aplicação, com cache controlado e origem privada em S3.', endpoint: 'd3pulseops.cloudfront.net'
  },
  {
    id: 'ast-002', name: 'S3 · pulseops-web', kind: 'Armazenamento', status: 'Operacional', environment: 'Produção', zone: 'sa-east-1', owner: 'Platform', updatedAt: 'há 4 min',
    description: 'Bucket privado que guarda o build estático. A leitura pública acontece somente pela origem OAC do CloudFront.', endpoint: 's3://pulseops-web'
  },
  {
    id: 'ast-003', name: 'EC2 · zabbix-server', kind: 'Monitoramento', status: 'Atenção', environment: 'Produção', zone: 'sa-east-1a', owner: 'SRE', updatedAt: 'há 7 min',
    description: 'Servidor de monitoramento com verificação HTTP periódica e regras para 404 e latência acima de 2s.', endpoint: '10.0.10.12'
  },
  {
    id: 'ast-004', name: 'VPC · pulseops-core', kind: 'Rede', status: 'Operacional', environment: 'Produção', zone: 'sa-east-1', owner: 'Network', updatedAt: 'há 11 min',
    description: 'Rede própria 10.0.0.0/16 segmentada em sub-redes públicas e privadas com regras de menor privilégio.', endpoint: 'vpc-0a12pulseops'
  },
  {
    id: 'ast-005', name: 'EC2 · app-runner', kind: 'Computação', status: 'Manutenção', environment: 'Staging', zone: 'sa-east-1b', owner: 'Engineering', updatedAt: 'há 28 min',
    description: 'Instância de laboratório usada para validar builds e testes controlados antes da publicação.', endpoint: '10.0.20.21'
  },
  {
    id: 'ast-006', name: 'Zabbix · web check', kind: 'Monitoramento', status: 'Operacional', environment: 'Produção', zone: 'São Paulo', owner: 'SRE', updatedAt: 'há 1 h',
    description: 'Monitor de disponibilidade que consulta o endereço distribuído pelo CloudFront a cada minuto.', endpoint: 'HTTP /health'
  }
];

@Injectable({ providedIn: 'root' })
export class AssetService {
  load(): Asset[] {
    let stored: string | null;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
    } catch {
      throw new Error('O armazenamento local não está disponível.');
    }

    if (!stored) return this.loadSeed();

    try {
      const parsed: unknown = JSON.parse(stored);
      const validAssets = Array.isArray(parsed) ? parsed.filter((item): item is Asset => this.isAsset(item)) : [];
      if (validAssets.length !== (Array.isArray(parsed) ? parsed.length : 0)) {
        throw new Error('Dados de inventário inválidos.');
      }
      return validAssets;
    } catch {
      return this.loadSeed();
    }
  }

  save(assets: Asset[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(assets));
    } catch {
      throw new Error('Não foi possível gravar o inventário local.');
    }
  }

  reset(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      throw new Error('Não foi possível limpar o inventário local.');
    }
  }

  create(draft: AssetDraft): Asset {
    return {
      ...draft,
      id: this.createUniqueId(),
      updatedAt: 'agora'
    };
  }

  private createUniqueId(): string {
    const cryptoApi = globalThis.crypto as Crypto & { randomUUID?: () => string } | undefined;
    if (cryptoApi?.randomUUID) return `ast-${cryptoApi.randomUUID()}`;
    return `ast-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  private seed(): Asset[] {
    return SEED_ASSETS.map((asset) => ({ ...asset }));
  }

  private loadSeed(): Asset[] {
    const assets = this.seed();
    try {
      this.save(assets);
    } catch {}
    return assets;
  }

  private isAsset(value: unknown): value is Asset {
    if (!value || typeof value !== 'object') return false;
    const asset = value as Partial<Asset>;
    return typeof asset.id === 'string'
      && typeof asset.name === 'string'
      && typeof asset.kind === 'string' && ASSET_KINDS.includes(asset.kind as AssetKind)
      && typeof asset.status === 'string' && ASSET_STATUSES.includes(asset.status as AssetStatus)
      && typeof asset.environment === 'string' && ENVIRONMENTS.includes(asset.environment as Asset['environment'])
      && typeof asset.zone === 'string'
      && typeof asset.owner === 'string'
      && typeof asset.updatedAt === 'string'
      && typeof asset.description === 'string'
      && typeof asset.endpoint === 'string';
  }
}
