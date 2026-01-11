// import { IACLPolicyEntry } from "@back/models/interfaces/IACLPolicy";
import { IUser, ACL, UserRoles } from "../../../backendImport";
import { DefaultLayout } from "@front/layouts/default-layout/component";
import { Binding, CaptureType, ExecutionContext, SyntheticViewTemplate } from "@microsoft/fast-element";

interface IACLPolicyEntry {
    [key: string]: any;
}

export function acl<TSource = any, TReturn = any>(
    aclString: string | Binding<TSource, TReturn>,
    templateOrTemplateBinding:
        | SyntheticViewTemplate
        | Binding<TSource, SyntheticViewTemplate>
): CaptureType<TSource> {
    const getTemplate: any = typeof templateOrTemplateBinding === 'function'
        ? templateOrTemplateBinding
        : (): SyntheticViewTemplate => templateOrTemplateBinding as any;

    return (source: TSource, context: ExecutionContext): SyntheticViewTemplate | null => {
        if(aclString && typeof aclString !== 'string') {
            aclString = aclString(source, context) as string;
        }


        if( !aclString) {
            return getTemplate(source, context);
        }        

        const user: IUser = DefaultLayout.USER;   
        
        if(!user){
            return null;
        }

        if(user.role === UserRoles.SUPER_ADMIN) {            
            return getTemplate(source, context);
        }        

        const aclPolicy: IACLPolicyEntry | null = user.acl;  
        
        if(!aclPolicy) {
            // If user is a standard user with no ACL policy, allow basic read operations
            if (user.role === UserRoles.USER && typeof aclString === 'string') {
                const [resource, action] = aclString.split('.');
                if (action === 'read') {
                    // Allow read access to basic resources
                    const allowedResources = ['avatar', 'ai', 'knowledge', 'project', 'profession', 'branch', 'step', 'question', 'answer', 'onboarding'];
                    return allowedResources.includes(resource) ? getTemplate(source, context) : null;
                }
            }
            console.warn(`No ACL policy found for user ${user.id}`);
            return null;
        }

        return ACL.checkACL(aclString as string, aclPolicy) ? getTemplate(source, context) : null;
    };
}