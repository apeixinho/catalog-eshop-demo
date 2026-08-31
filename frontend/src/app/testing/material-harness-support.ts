import { ComponentFixture } from '@angular/core/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { HarnessLoader } from '@angular/cdk/testing';

export function harnessLoader<T>(fixture: ComponentFixture<T>): HarnessLoader {
  return TestbedHarnessEnvironment.loader(fixture);
}
