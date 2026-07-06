import { SetMetadata } from '@nestjs/common';
import { FEATURE_KEY } from '../guards/quota.guard';

export const Feature = (feature: string) => SetMetadata(FEATURE_KEY, feature);
