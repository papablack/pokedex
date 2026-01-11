import { IWithCompose } from "@rws-framework/client/src/components/_component";

export interface IFrontRouteDef {
    path: string,
    name: string,
    acl?: string, // Format: ${aclResources.[resource]}.${aclActions.[action]}
    component: IWithCompose<any>,
    icon?: string,
    forceActive?: string,
    inMenu?: boolean,
    children?: IFrontRouteDef[]
}