// 模型目录：后端 sale_* → 前端 *_price_per_million
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapModelPricesFromApi<T>(item: T): T {
  const { sale_input_per_million, sale_output_per_million, sale_cached_input_per_million, ...rest } = item as any;
  return {
    ...rest,
    input_price_per_million: sale_input_per_million ?? null,
    output_price_per_million: sale_output_per_million ?? null,
    cached_input_price_per_million: sale_cached_input_per_million ?? null,
  } as T;
}

// 模型目录：前端 *_price_per_million → 后端 sale_*
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapModelPricesToApi<T>(payload: T): T {
  const { input_price_per_million, output_price_per_million, cached_input_price_per_million, ...rest } = payload as any;
  return {
    ...rest,
    sale_input_per_million: input_price_per_million,
    sale_output_per_million: output_price_per_million,
    sale_cached_input_per_million: cached_input_price_per_million,
  } as T;
}

// 号池模型：后端 cost_* → 前端 *_price_per_million
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapPoolModelPricesFromApi<T>(item: T): T {
  const { cost_input_per_million, cost_output_per_million, cost_cached_input_per_million, ...rest } = item as any;
  return {
    ...rest,
    input_price_per_million: cost_input_per_million ?? 0,
    output_price_per_million: cost_output_per_million ?? 0,
    cached_input_price_per_million: cost_cached_input_per_million ?? null,
  } as T;
}

// 号池模型：前端 *_price_per_million → 后端 cost_*
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapPoolModelPricesToApi<T>(payload: T): T {
  const { input_price_per_million, output_price_per_million, cached_input_price_per_million, ...rest } = payload as any;
  return {
    ...rest,
    cost_input_per_million: input_price_per_million,
    cost_output_per_million: output_price_per_million,
    cost_cached_input_per_million: cached_input_price_per_million,
  } as T;
}
