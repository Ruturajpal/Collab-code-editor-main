import { Routes } from '@angular/router';
import { Home } from './component/home/home';
import { Editor } from './component/editor/editor';

export const routes: Routes = [
    { path:' ', component:Home},{path:'editor', component:Editor}
 
];
