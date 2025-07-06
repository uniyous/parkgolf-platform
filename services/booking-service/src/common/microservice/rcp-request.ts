export interface RpcHeaders {
  [key: string]: string | string[] | number | boolean | undefined;
}

/**
 * 기본 RPC 요청 객체
 */
export class RpcRequest<TData> {
  public readonly headers?: RpcHeaders;
  public readonly data: TData;

  constructor(data: TData, headers?: RpcHeaders) {
    this.data = data;
    this.headers = headers;
  }

  static of<TData>(data: TData, headers?: RpcHeaders): RpcRequest<TData> {
    return new RpcRequest<TData>(data, headers);
  }

  public toString(): string {
    return JSON.stringify(this);
  }
}

export class Pagination {
  public readonly page: number;
  public readonly limit: number;

  constructor(page: number, limit: number) {
    if (page < 1) throw new Error('Page number must be 1 or greater.');
    if (limit < 1) throw new Error('Limit must be 1 or greater.');
    this.page = page;
    this.limit = limit;
  }

  get offset(): number {
    return (this.page - 1) * this.limit;
  }

  static of(page: number, limit: number): Pagination {
    return new Pagination(page, limit);
  }
}

export class RpcPaginationRequest<TData, TPagination extends Pagination = Pagination> {
  public readonly headers?: RpcHeaders;
  public readonly data: TData;
  public readonly pagination: TPagination;

  constructor(data: TData, pagination: TPagination, headers?: RpcHeaders) {
    this.data = data;
    this.pagination = pagination;
    this.headers = headers;
  }

  static of<TData, TPagination extends Pagination = Pagination>(
    data: TData,
    pagination: TPagination,
    headers?: RpcHeaders,
  ): RpcPaginationRequest<TData, TPagination> {
    return new RpcPaginationRequest<TData, TPagination>(data, pagination, headers);
  }

  public toString(): string {
    return JSON.stringify(this);
  }
}
