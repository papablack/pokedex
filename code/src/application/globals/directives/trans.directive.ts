import { Binding, ExecutionContext } from "@microsoft/fast-element";

export function trans<TSource = any, TReturn = any>(
    transKey: string | Binding<TSource, TReturn>   
): (source: TSource, context: ExecutionContext) => string {
    return (source: TSource, context: ExecutionContext): string => {
        if(transKey && typeof transKey !== 'string') {
            transKey = transKey(source, context) as string;
        }

        if(!transKey) {
            return '';
        }        

        return (transKey as string).t();
    };
}