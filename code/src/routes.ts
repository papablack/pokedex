import { renderRouteComponent } from '@rws-framework/browser-router';
import { HomePage } from './pages/home/component';
import { IFrontRouteDef } from './types/route.types';



export const frontRoutes: IFrontRouteDef[] = [
    {
        path: '/',
        name: 'route.dashboard'.t(),
        component: HomePage,        
        icon: 'shop-4',
        inMenu: true
    }
];

const routeMap = {};

for (const frontRoute of frontRoutes) {
    if (frontRoute.children) {
        for (const child of frontRoute.children) {
            routeMap[child.path] = renderRouteComponent(child.name, child.component);
        }
    } else {
        routeMap[frontRoute.path] = renderRouteComponent(frontRoute.name, frontRoute.component);
    }
}

export default routeMap;