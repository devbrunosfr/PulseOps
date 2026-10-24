export type AssetStatus = 'Operacional' | 'Atenção' | 'Manutenção' | 'Offline';
export type AssetKind = 'Distribuição' | 'Computação' | 'Rede' | 'Monitoramento' | 'Armazenamento';

export interface Asset {
  id: string;
  name: string;
  kind: AssetKind;
  status: AssetStatus;
  environment: 'Produção' | 'Staging' | 'Laboratório';
  zone: string;
  owner: string;
  updatedAt: string;
  description: string;
  endpoint: string;
}

export type AssetDraft = Omit<Asset, 'id' | 'updatedAt'>;
