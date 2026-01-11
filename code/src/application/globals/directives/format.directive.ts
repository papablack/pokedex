// import { isFunction } from "@microsoft/fast-element/dist/esm/interfaces";
// import type { Binding, ExecutionContext } from "@microsoft/fast-element/dist/esm/observation/observable";
// import type { CaptureType, SyntheticViewTemplate } from "@microsoft/fast-element/dist/esm/templating/template";
// import { CaptureType, ExecutionContext, SyntheticViewTemplate } from "@microsoft/fast-element";
import { DateUtils } from "@rws-framework/console";

export function format<TSource = any>(date: Date, format = 'yyyy-MM-dd HH:mm:ss'): string {
    return DateUtils.create(date).format(format);
}
