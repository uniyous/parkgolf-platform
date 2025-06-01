export class RpcResponse<TData> {
  public readonly data: TData;

  constructor(data: TData) {
    this.data = data;
  }

  static of<TData>(data: TData): RpcResponse<TData> {
    return new RpcResponse<TData>(data);
  }

  public toString(): string {
    return JSON.stringify(this);
  }
}

export class PaginationMeta {
  public readonly totalItems: number;
  public readonly currentPage: number;
  public readonly itemsPerPage: number; // 요청 시 사용된 limit 값
  public readonly totalPages: number;

  constructor(totalItems: number, currentPage: number, itemsPerPage: number) {
    if (totalItems < 0) throw new Error('Total items cannot be negative.');
    if (currentPage < 1 && totalItems > 0) throw new Error('Current page must be 1 or greater when');
    if (itemsPerPage < 1 && totalItems > 0) throw new Error('Items per page must be 1 or greater when there are items.');

    this.totalItems = totalItems;
    this.currentPage = totalItems === 0 ? 1 : currentPage; // 아이템이 없으면 현재 페이지는 1로 간주
    this.itemsPerPage = totalItems === 0 ? itemsPerPage : itemsPerPage > 0 ? itemsPerPage : totalItems; // 아이템이 없거나 itemsPerPage가 0이하면 전체 아이템 수를 한 페이지로
    this.totalPages = itemsPerPage > 0 ? Math.max(1, Math.ceil(totalItems / itemsPerPage)) : 1; // 최소 1페이지
  }

  static of(totalItems: number, page: number, limit: number): PaginationMeta {
    return new PaginationMeta(totalItems, page, limit);
  }
}

export class RpcPaginationResponse<TDataItem, TMeta extends PaginationMeta = PaginationMeta> {
  public readonly data: TDataItem[];
  public readonly meta: TMeta;

  constructor(data: TDataItem[], meta: TMeta) {
    this.data = data;
    this.meta = meta;
  }

  static of<TDataItem, TMeta extends PaginationMeta = PaginationMeta>(data: TDataItem[], meta: TMeta): RpcPaginationResponse<TDataItem, TMeta> {
    return new RpcPaginationResponse<TDataItem, TMeta>(data, meta);
  }

  public toString(): string {
    return JSON.stringify(this);
  }
}
