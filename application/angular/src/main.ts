import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { PackagingTrizToolComponent } from './app/components/packaging-triz-tool/packaging-triz-tool.component';

bootstrapApplication(PackagingTrizToolComponent, appConfig).catch((err) => console.error(err));
