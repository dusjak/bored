import type { MaterialId } from './pathLight.ts';

/** Half-range used to pack each material's rest micro-offset into 16-bit RG. */
export const MICRO_PACK: Record<MaterialId, { half: number; xSha256: string; ySha256: string }> = {
  gummi: {
    half: 1.0297083854675293,
    xSha256: 'f8bb795cdd53b22814da7d8c5dba18bea7cc8b1118cb7af2e0d54550ac88bb1f',
    ySha256: '9a8c03c7ad2e3fc809d39e9adfbe7ff27e0af141ea5378e52d2f4bdfbb25ce13',
  },
  skifer: {
    half: 1.609177827835083,
    xSha256: '48447b813245be1fd6826db2e4f4839b0ffe2bd2f6c2aa9698215d6bce431725',
    ySha256: 'a9c6c68cea910959600711d58a5dd94c6e07ce45e5e928f99cd0be005a025de8',
  },
  kull: {
    half: 1.7798051834106445,
    xSha256: 'ed8bd1ee84886e0283cd02278a9762fbc5bcfff99429fc61338dd47d0bea1065',
    ySha256: '5ec03bfedb511dc39a406bb66a64c34cd56048e432b08f4d44b2510bf53059be',
  },
  emalje: {
    half: 0.9267505407333374,
    xSha256: 'f0063f054f8890592d0e6c091833890e14587823ea006304483bc17ab7f2c16e',
    ySha256: 'e80fd7603989f9bea23311a69097f9d7d9bb41807ee3585520d674af0be4b1d8',
  },
  floyel: {
    half: 1.2098984718322754,
    xSha256: 'e63d2826fa3154330634390e21cbbf91e39c014e39a5ecbbb8e58daa7c9ae5bc',
    ySha256: '3bbbb6f2e1245efaac6785f88252c5179ecc0ffd1f238a68ce771ba4efe24216',
  },
};
