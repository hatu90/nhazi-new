/** Every usecase: one class, one `execute`, dependencies injected as ports. */
export interface IUseCase<TInput, TOutput> {
  execute(input: TInput): Promise<TOutput>;
}
