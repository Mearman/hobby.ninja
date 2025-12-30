## [1.8.0](https://github.com/Mearman/hobby.ninja/compare/v1.7.1...v1.8.0) (2025-12-30)

### Features

- **next:** add CSS transition-based thumb animation ([4b4ac76](https://github.com/Mearman/hobby.ninja/commit/4b4ac76ca89a4d871e0c15647a957a4e4d57d925))
- **next:** add skeleton loading overlay to item cards ([9a9405d](https://github.com/Mearman/hobby.ninja/commit/9a9405d58c78d7bea25ba7077d1475e2fc1ddd4c))
- **next:** display badges in 2x2 grid layout ([b71efb6](https://github.com/Mearman/hobby.ninja/commit/b71efb63ee2c5e1fb70b9a899e472b1dff0dc1ae))
- **next:** implement teleport scroll for fast year navigation ([60be4be](https://github.com/Mearman/hobby.ninja/commit/60be4bedda5256833f9305040476fe3b1e52ca08))
- **next:** make explore card title and badges share space flexibly ([722a0e6](https://github.com/Mearman/hobby.ninja/commit/722a0e64c6994301b3173680f4a85637fff2c21d))
- **next:** make YearScrollbar responsive for mobile ([13916cf](https://github.com/Mearman/hobby.ninja/commit/13916cf05257349f831318f1453de01c5916b98c))

### Bug Fixes

- **data:** add 30ML category to 9 uncategorized items ([21f6f41](https://github.com/Mearman/hobby.ninja/commit/21f6f41243adb1bf1b6cc710cc1f62d4fb61d471))
- **data:** add characterplastic category to 144 uncategorized items ([1c94ff8](https://github.com/Mearman/hobby.ninja/commit/1c94ff8034201fcf35daa8a1b60f41483ed59d4c))
- **data:** add gunpla category to 74 uncategorized items ([c7ddfa6](https://github.com/Mearman/hobby.ninja/commit/c7ddfa6972613f02101c1fa8d31d4b996ea6d404))
- **next:** add dynamic height multiplier for badge row scaling ([8d9373e](https://github.com/Mearman/hobby.ninja/commit/8d9373e62f7b3622a9da4153e823050537eca9b4))
- **next:** add responsive right padding for year scrollbar clearance ([4fdee41](https://github.com/Mearman/hobby.ninja/commit/4fdee41d356d068e42b72ad34ca2753f6a106f50))
- **next:** align explore card badges to bottom of card ([dcff384](https://github.com/Mearman/hobby.ninja/commit/dcff3840a7814cd6216e377bb0e6955b896e15f8))
- **next:** allow touch scrolling past YearScrollbar year labels on tablet ([7985876](https://github.com/Mearman/hobby.ninja/commit/798587645116902176642ea641db34487c6938bc))
- **next:** calculate virtual grid row height dynamically ([5662ab8](https://github.com/Mearman/hobby.ninja/commit/5662ab821e9a16e351a26fa0858cfdd99d8cda0e))
- **next:** evenly distribute badges horizontally ([f1d7e72](https://github.com/Mearman/hobby.ninja/commit/f1d7e721535b7112bc75f906c7c3ffa683cbfeb3))
- **next:** fix card image sizing and bottom gap issues ([a7fc6cd](https://github.com/Mearman/hobby.ninja/commit/a7fc6cda50bcd26c4e7633d5b666a60b1a94add1))
- **next:** improve badge text display for small sizes ([25b79eb](https://github.com/Mearman/hobby.ninja/commit/25b79eb682f41de4e944f8f872cbdf9ccc430cf3))
- **next:** improve entity badge responsiveness on explore cards ([2ac4f63](https://github.com/Mearman/hobby.ninja/commit/2ac4f63980a9b9e385fff1e97d7b8a0d8a6ffc25))
- **next:** improve header responsiveness across breakpoints ([9853735](https://github.com/Mearman/hobby.ninja/commit/9853735ebc57ff43b7cd82724fbd8052f350ed5c))
- **next:** make all explore cards the same height ([a1ac676](https://github.com/Mearman/hobby.ninja/commit/a1ac676b97a68fe0f24441082e2fe5113f7ceed4))
- **next:** make theme toggle icon same size as other header icons ([e57ad8f](https://github.com/Mearman/hobby.ninja/commit/e57ad8fbae16461062583384d17deebfc77a4a4e))
- **next:** prevent page scroll interception during YearScrollbar drag ([9fc4e1f](https://github.com/Mearman/hobby.ninja/commit/9fc4e1f6cbddef5fb8fa76ecc485af0930c78046))
- **next:** properly center scroll-to-top button with track ([202fd2c](https://github.com/Mearman/hobby.ninja/commit/202fd2cfb09e6495624aadbdf7681ce8dd90804b))
- **next:** reduce badge gaps and increase badge size ([13b3f1f](https://github.com/Mearman/hobby.ninja/commit/13b3f1f795380551a69c27c87335af68dbc6ca78))
- **next:** reduce bottom padding below card badges ([0385d8a](https://github.com/Mearman/hobby.ninja/commit/0385d8aaa3b2a5450076594ef4194290dba4984e))
- **next:** reduce YearScrollbar height to 70vh to clear header ([877304e](https://github.com/Mearman/hobby.ninja/commit/877304ecf3d7383862f8ceceb95668cddf21d4b4))
- **next:** remove fixed height from card containers ([cd2a23f](https://github.com/Mearman/hobby.ninja/commit/cd2a23ff47b5f8c5048682f5253fcf8a9c729e97))
- **next:** restore vertical gaps between explore card rows ([a35da8b](https://github.com/Mearman/hobby.ninja/commit/a35da8be29a104884de0488b55c1ea5049804180))
- **next:** set fixed height for badge row to ensure uniform card sizes ([3ca76ef](https://github.com/Mearman/hobby.ninja/commit/3ca76ef7e1783873a95f034484c5eb9ceedd69c5))
- **next:** skip scroll handler updates during thumb animation ([9e2053d](https://github.com/Mearman/hobby.ninja/commit/9e2053d2861f8412cb0815c439190a52aa388ad6))
- **next:** stop propagation on scroll-to-top to prevent track click ([5f73c4f](https://github.com/Mearman/hobby.ninja/commit/5f73c4f4d9cfae2201030300e413bf471be00a1e))
- **next:** uniform badge sizing and remove extra padding ([ba61ddd](https://github.com/Mearman/hobby.ninja/commit/ba61ddd2ef660d41b154a3fc18f3c045aa990533))
- **next:** use CSS grid for uniform badge sizing across all cards ([1e4cd00](https://github.com/Mearman/hobby.ninja/commit/1e4cd0089f5e13bd40cf68c177bfd097ea90fb7b))
- **next:** use flexbox wrap for badge layout with centered overflow ([57f21b3](https://github.com/Mearman/hobby.ninja/commit/57f21b38ab559125067f5a17dc5b14654be29201))

### Refactoring

- **next:** change explore card badges to single flexible row ([5ffb4c4](https://github.com/Mearman/hobby.ninja/commit/5ffb4c437b548689e2dd9acaef8aca2476f92510))
- **next:** convert YearScrollbar thumb to direct DOM manipulation ([d43547a](https://github.com/Mearman/hobby.ninja/commit/d43547a2ade4e436890ee059032ef8e049bb50d1))
- **next:** integrate scroll-to-top button into YearScrollbar ([6822d16](https://github.com/Mearman/hobby.ninja/commit/6822d16bf8ae350c6b170d3e8bc526b943fb2280))
- **next:** move explore card title below product image ([acdac4f](https://github.com/Mearman/hobby.ninja/commit/acdac4fbe496b915977719549a58da31efbcf096))
- **next:** reorder explore card badges with category first ([311702d](https://github.com/Mearman/hobby.ninja/commit/311702d79ae2253c2b1a1523a88b0366d32fe58a))
- **next:** use virtualizer scrollToIndex and expose row metrics ([4209d36](https://github.com/Mearman/hobby.ninja/commit/4209d3620907b1e320cdc7e9768864066d31c133))

### Styling

- **next:** increase YearScrollbar height to nearly full viewport ([3a3c90e](https://github.com/Mearman/hobby.ninja/commit/3a3c90ef10e9f3bfda7c2b28eb14be6061581e88))
- **next:** position scroll-to-top as final point below track ([91e6b96](https://github.com/Mearman/hobby.ninja/commit/91e6b964904f2e72cc2004d68044c8864dccc3f8))

## [1.7.1](https://github.com/Mearman/hobby.ninja/compare/v1.7.0...v1.7.1) (2025-12-29)

### Bug Fixes

- **data:** correct category for 62 items with 30... brands to 30ML ([29299e2](https://github.com/Mearman/hobby.ninja/commit/29299e2baa2b0c0107750d46dba45f07066fbfa2))
- **data:** remove duplicate brand entries from 497 items ([e1f3d46](https://github.com/Mearman/hobby.ninja/commit/e1f3d46dd895ffcdaeacc6c4920f2ba872bb1ecc))
- **next:** position year marks at actual scroll positions ([699f206](https://github.com/Mearman/hobby.ninja/commit/699f20693f132f7635e8a8eb43126d22110e26fe))
- **next:** use scroll progress for smoother year scrollbar positioning ([f2f86ba](https://github.com/Mearman/hobby.ninja/commit/f2f86ba6d24dca4fa3053a3d249ad9cfd334b36b))

### Refactoring

- **next:** rewrite YearScrollbar as self-contained scroll-tracking component ([30bb149](https://github.com/Mearman/hobby.ninja/commit/30bb149966f6a15178e5af264cef7d658f795c67))

## [1.7.0](https://github.com/Mearman/hobby.ninja/compare/v1.6.0...v1.7.0) (2025-12-29)

### Features

- **next:** add dual thumb indicators to year scrollbar ([2f71a2b](https://github.com/Mearman/hobby.ninja/commit/2f71a2bd188e5f8a2f5717117bffbdd883ec0da2))

### Bug Fixes

- **next:** improve scroll year detection smoothness and accuracy ([ef48801](https://github.com/Mearman/hobby.ninja/commit/ef48801a760edf83338f05bf33964519b773ef7b))
- **next:** improve scroll year detection with fresh position calculations ([c9bfa69](https://github.com/Mearman/hobby.ninja/commit/c9bfa690c79899ad0ed39da04fa7f4085bae7664))
- **next:** persist year scrollbar target indicator until scroll completes ([e74b0c1](https://github.com/Mearman/hobby.ninja/commit/e74b0c130645c076d101aeffe4104c5081e1c03b))

### Performance

- **ci:** implement tarball-based caching for Next.js output ([73da343](https://github.com/Mearman/hobby.ninja/commit/73da343489f7a7bfbdd2edd92dee3f7709db1649))

## [1.6.0](https://github.com/Mearman/hobby.ninja/compare/v1.5.0...v1.6.0) (2025-12-29)

### Features

- **next:** add outline to selected entity badges on cards ([3c8ec54](https://github.com/Mearman/hobby.ninja/commit/3c8ec54c44f7167590be03e0d49aedd7bbc4b97b))
- **next:** add tag color utility with official brand colors ([ef06f37](https://github.com/Mearman/hobby.ninja/commit/ef06f37c44726acd54794e2c95eaf6df213f4614)), closes [#9e2222](https://github.com/Mearman/hobby.ninja/issues/9e2222) [#01598b](https://github.com/Mearman/hobby.ninja/issues/01598b) [#d3ba66](https://github.com/Mearman/hobby.ninja/issues/d3ba66) [#e67300](https://github.com/Mearman/hobby.ninja/issues/e67300) [#616364](https://github.com/Mearman/hobby.ninja/issues/616364)
- **next:** apply brand colors to tags index page ([c056ca7](https://github.com/Mearman/hobby.ninja/commit/c056ca71df2462fea601a0db43beabed55d58207))
- **next:** display clickable distribution tags on item pages ([a30222e](https://github.com/Mearman/hobby.ninja/commit/a30222ed54a4e65404c1b0e8af8ce33428cbd76f))

### Bug Fixes

- **ci:** disable cache for next:build due to EMFILE limits ([312e80d](https://github.com/Mearman/hobby.ninja/commit/312e80d7f41679e9885b121f9365e51603e58170))
- **data:** correct Haro translation from "halo" to proper name ([76324e9](https://github.com/Mearman/hobby.ninja/commit/76324e9939f046fee3704bcb72734947cb6b3814))
- **next:** ensure year scrollbar tooltip renders above labels ([46a409d](https://github.com/Mearman/hobby.ninja/commit/46a409df2d8135bedc562d68bb8f7625bd67ff5f))
- **next:** keep last known year when no items in viewport center ([4159d12](https://github.com/Mearman/hobby.ninja/commit/4159d122691c2c74a02cfe4b7efb03eaf9f68dda))
- **next:** rewrite scroll year detection for virtual scrolling ([a8c46a8](https://github.com/Mearman/hobby.ninja/commit/a8c46a8c0b4de8c29cc062f3df9c6fc02a38db81))
- **next:** rewrite year scrollbar as custom vertical slider ([fe81a6e](https://github.com/Mearman/hobby.ninja/commit/fe81a6eb3cfe5547a6205ad24609505500b4538e))
- **next:** scroll year navigation to position item at window top ([79bd7d7](https://github.com/Mearman/hobby.ninja/commit/79bd7d75c3adf28b31295354c38cc02b877f72ce))
- **next:** show "Select none" when any filter is selected ([c6e8d6e](https://github.com/Mearman/hobby.ninja/commit/c6e8d6e76aafefc7ffefa7c71f3bc4ed3e55cd78))
- **next:** use theme-aware colors in year scrollbar ([0e95f1d](https://github.com/Mearman/hobby.ninja/commit/0e95f1d8ffe1806b55e669ef8585298b94ff06a2))
- **next:** use transparent outline on unselected badges to reserve space ([4e4203e](https://github.com/Mearman/hobby.ninja/commit/4e4203e999dcf4bf0c1d44f5fd4b8db21fff5980))

### Performance

- **ci:** enable Nx caching for next:build with Nx Cloud ([f6ada97](https://github.com/Mearman/hobby.ninja/commit/f6ada979758aaa2d7f702bd66ea3160555645861))

## [1.5.0](https://github.com/Mearman/hobby.ninja/compare/v1.4.0...v1.5.0) (2025-12-29)

### Features

- **ci:** add Nx Cloud remote caching support ([bb9ab48](https://github.com/Mearman/hobby.ninja/commit/bb9ab48fe2a661f66c4e10a539442305f6d7a3fc))
- **data:** add tags support to ItemPageData ([04cf192](https://github.com/Mearman/hobby.ninja/commit/04cf192d984e61c5de97e7532673e4a2d18d7928))
- **next:** make card entity badges clickable to toggle filters ([6876b9c](https://github.com/Mearman/hobby.ninja/commit/6876b9cab65d7288fd71feafe6aade2944d846e1))
- **next:** make card images square with 1:1 aspect ratio ([881e9ad](https://github.com/Mearman/hobby.ninja/commit/881e9adb14123c76e5af0e0a2a662761831850f2))

### Refactoring

- **next:** show year scrollbar major ticks on 5-year intervals ([c803a8b](https://github.com/Mearman/hobby.ninja/commit/c803a8b2a49b5e819881563931005f373e8e4b01))

## [1.4.0](https://github.com/Mearman/hobby.ninja/compare/v1.3.1...v1.4.0) (2025-12-29)

### Features

- **next:** add data-year attributes to explore section items ([e958bbe](https://github.com/Mearman/hobby.ninja/commit/e958bbeb3316b4c98aa0e986b16715ca2eb14831))
- **next:** add loadUntil method to infinite scroll hook ([910a37b](https://github.com/Mearman/hobby.ninja/commit/910a37b2603575a6a8517d885d09ffc150afcd4e))
- **next:** add scroll-to-top button component ([b1ab8b5](https://github.com/Mearman/hobby.ninja/commit/b1ab8b5759bbef0f57039b296331d89ed2f40723))
- **next:** add useScrollYear hook for year detection ([65bb35a](https://github.com/Mearman/hobby.ninja/commit/65bb35a3939edc855acb756a2e69f66a7ace1ba8))
- **next:** add useVirtualGrid hook for window-based virtualization ([a43a161](https://github.com/Mearman/hobby.ninja/commit/a43a161dcd18066aaf82641baa739f8040442c5f))
- **next:** add year scrollbar navigation component ([6df67b8](https://github.com/Mearman/hobby.ninja/commit/6df67b85d2fd4e8a88d6c1288c77cea0f4cf79a5))
- **next:** integrate scroll navigation on homepage ([933f95b](https://github.com/Mearman/hobby.ninja/commit/933f95b7abf5c342051e57cbfb40ec61d831d872))
- **next:** replace infinite scroll with virtual grid in ExploreSection ([a8ccf5c](https://github.com/Mearman/hobby.ninja/commit/a8ccf5c3dae7e694923d9fd7d79cd68552ff615b))
- **next:** use virtual grid scrollToYear for year navigation ([d406650](https://github.com/Mearman/hobby.ninja/commit/d406650e1024220219cef2f9e323ac6b48326902))

### Bug Fixes

- **build:** disable workerThreads due to webpack config incompatibility ([17fd88a](https://github.com/Mearman/hobby.ninja/commit/17fd88a24aa2fa478b52b1836af463e18ee0e293))
- **build:** disable workerThreads for plugin compatibility ([48464da](https://github.com/Mearman/hobby.ninja/commit/48464da1cd05206bdd9d127f6549dafc9cc4591c))
- **ci:** revert to cache: false for next:build ([bd6128d](https://github.com/Mearman/hobby.ninja/commit/bd6128dda73d450440e086947ef1e56b9d9e3e94))
- **next:** convert virtual row positions from window to container-relative ([a84789c](https://github.com/Mearman/hobby.ninja/commit/a84789c84eb7067a1d089939809677a35f1e822b))

### Performance

- **build:** enable Vanilla Extract plugin and worker threads ([a77887f](https://github.com/Mearman/hobby.ninja/commit/a77887f86fdc3bbe9c332ae029f195c8b827087a))
- **build:** enable worker threads and Nx Cloud caching ([be162cb](https://github.com/Mearman/hobby.ninja/commit/be162cb6182cf03056cc02038c5609c6846d951d))

### Documentation

- **next:** generalize loadUntil comment in useInfiniteScroll ([32c4185](https://github.com/Mearman/hobby.ninja/commit/32c418552c4da69c58ace8916e2fa2f7bf884b19))

## [1.3.1](https://github.com/Mearman/hobby.ninja/compare/v1.3.0...v1.3.1) (2025-12-29)

### Bug Fixes

- **nx:** disable cache only for next:build target ([6be1732](https://github.com/Mearman/hobby.ninja/commit/6be1732f1ec37b64662e467e3a306658d57abeca))

## [1.3.0](https://github.com/Mearman/hobby.ninja/compare/v1.2.0...v1.3.0) (2025-12-29)

### Features

- **cli:** add English tag extraction to global site lookup ([276b918](https://github.com/Mearman/hobby.ninja/commit/276b91874cd5668ee60d984a6a2c015e64067671))
- **cli:** add tag extraction to bandai catalog parser ([26fb20a](https://github.com/Mearman/hobby.ninja/commit/26fb20a9fb40610d37bd2fc9ee665aae877b517b))
- **data:** add script to backfill tags from HTML files ([10cc349](https://github.com/Mearman/hobby.ninja/commit/10cc349445fc15f9eacd2c8c935a7ee2f6fca79b))
- **data:** add TagRef schema for distribution channel tags ([9b114f6](https://github.com/Mearman/hobby.ninja/commit/9b114f6082eadd8dc02cfdb884cfe448de23c72f))
- **data:** populate tags for 1478 items ([d9eda54](https://github.com/Mearman/hobby.ninja/commit/d9eda549ceede97f77b08e3d6a530cb6701a04fd))
- **nx-cloud:** setup nx cloud workspace ([d4358da](https://github.com/Mearman/hobby.ninja/commit/d4358da0ef004e58868d79f5cf5af39a387923a3))

### Bug Fixes

- **ci:** increase file descriptor limit for Nx caching ([6ad6bc6](https://github.com/Mearman/hobby.ninja/commit/6ad6bc66f36208888a68ab49cf27b924d2e97dda))
- **ci:** skip Nx cache for build to avoid EMFILE error ([c1dca14](https://github.com/Mearman/hobby.ninja/commit/c1dca14f685cf5958a7dcb0c346f7ebc79ed015f))
- **data:** clean up 01_6976.json bullet points and accessory format ([db31edf](https://github.com/Mearman/hobby.ninja/commit/db31edf17c3327c3e0982af4369ad96bceb1b737))
- **eslint:** ignore all .cjs files at any directory depth ([60b702f](https://github.com/Mearman/hobby.ninja/commit/60b702f42b2528b6a42025505164e6b35c58b437))
- **eslint:** ignore files not in TS projects and fix CLI patterns ([0a94c01](https://github.com/Mearman/hobby.ninja/commit/0a94c01ae2367c21c4f030a12b426a6fd918d93c))
- **next:** center title text vertically in FittedTitle container ([28bdec4](https://github.com/Mearman/hobby.ninja/commit/28bdec43f9f82448bf147278fb0cf6d639d74ec9))
- **next:** reduce FittedTitle padding for more text space ([210ce1e](https://github.com/Mearman/hobby.ninja/commit/210ce1e7329adcfc46fcfd44b3667895aafa51f4))
- **nx:** enable Nx Cloud remote caching ([7a65590](https://github.com/Mearman/hobby.ninja/commit/7a65590b1b55a235ef302bcfad905737ca8ae8cd))

### Refactoring

- **next:** add 15px font size for more granular title scaling ([8555d02](https://github.com/Mearman/hobby.ninja/commit/8555d0274bdb8d88d760dd20aa220a07e43f0cee))

### CI/CD

- add filter:tree:0 to checkout for faster clones ([fe46a91](https://github.com/Mearman/hobby.ninja/commit/fe46a918aed1f8a5ebefd66599f9c692b7057713))
- add nrwl/nx-set-shas for better affected detection ([8bc7679](https://github.com/Mearman/hobby.ninja/commit/8bc76790ca20a2da76cd98b6411d7bf53fa90552))
- remove --fix flag from lint step ([c12578c](https://github.com/Mearman/hobby.ninja/commit/c12578c3cb6bb141a5ee764d6fa35ff329cd8b0c))
- standardize Node.js version to 22 in build job ([119024d](https://github.com/Mearman/hobby.ninja/commit/119024dd0a3c9c08ecd590064aa2b2a6308537b3))

### Chores

- update pnpm-lock.yaml for cli data dependency ([9979112](https://github.com/Mearman/hobby.ninja/commit/997911212ee6534b0cf427a5cb2921d1c2712699))

## [1.2.0](https://github.com/Mearman/hobby.ninja/compare/v1.1.0...v1.2.0) (2025-12-28)

### Features

- **next:** add category badge to item cards ([7f9de07](https://github.com/Mearman/hobby.ninja/commit/7f9de07b5f600785972d21b2a54a1008905d0e92))

### Bug Fixes

- **data:** clean up 01_6976.json description and accessories ([8444be1](https://github.com/Mearman/hobby.ninja/commit/8444be16d81f849bb246ace6709783abe95452ae))
- **data:** remove non-existent image from characterplastic category ([7bc0346](https://github.com/Mearman/hobby.ninja/commit/7bc034651249f8dbcc3cfa5c135f5eea1e95971e))
- **data:** replace characterplastic brand with category ([7719eb9](https://github.com/Mearman/hobby.ninja/commit/7719eb9bb1229d6d84d048835014b7d966cb02e3))
- **data:** update pb brand image path to .png ([6bd3161](https://github.com/Mearman/hobby.ninja/commit/6bd316186d2613251a3a91f6cf414adedb2ce888))

### Refactoring

- **next:** improve FittedTitle height measurement ([f7171a8](https://github.com/Mearman/hobby.ninja/commit/f7171a8c3c882524c131052d9cfb5e4b45a3eb9c))
- **scripts:** apply lint fixes to all scripts ([a131159](https://github.com/Mearman/hobby.ninja/commit/a1311596ca771ac29ad96a905987c7e39d1aaa05))

### Styling

- **next:** improve entity badge text visibility ([a3aacfe](https://github.com/Mearman/hobby.ninja/commit/a3aacfecfdae93a2a093ac15a76cb0dd3e3844e8))
- **next:** reduce entity badge width to 20% ([81acb56](https://github.com/Mearman/hobby.ninja/commit/81acb56134bec7894ebffac79cbec95527993ced))

### Chores

- **data:** remove item_all category ([7219955](https://github.com/Mearman/hobby.ninja/commit/72199557fc93302645507c369dc85f6e29c56491))
- **data:** remove item_all category references from 95 items ([a14929e](https://github.com/Mearman/hobby.ninja/commit/a14929eaad52d6b63f12072699132741f77189be))
- **lint:** enable linting for scripts directory ([38fd248](https://github.com/Mearman/hobby.ninja/commit/38fd24858e14b3cd4adecc5207558ad1b7e5de74))
- remove deprecated apps/web application ([537829c](https://github.com/Mearman/hobby.ninja/commit/537829ce1a064b4a78b3f01edda3ef81fb079881))
- **scripts:** add typescript config for scripts directory ([b6b561e](https://github.com/Mearman/hobby.ninja/commit/b6b561ec5d0366c62da4854512b78c8b0cfe65e3))

## [1.1.0](https://github.com/Mearman/hobby.ninja/compare/v1.0.1...v1.1.0) (2025-12-28)

### Features

- **next:** add columns prop to CollapsibleGrid ([388c43e](https://github.com/Mearman/hobby.ninja/commit/388c43e27e2d5c83e210d406a086992293c5fe33))
- **next:** show item count below filter card instead of on hover ([f2a620c](https://github.com/Mearman/hobby.ninja/commit/f2a620c1537354e80cbcc1bc64ef9d8b976d13e4))
- **next:** show item count below filter card with theme colors ([bd0696a](https://github.com/Mearman/hobby.ninja/commit/bd0696ae35b326f8f7a0df33cc2ff456747361c2))

### Bug Fixes

- **cli:** remove unnecessary optional chaining in translate-command ([023ab70](https://github.com/Mearman/hobby.ninja/commit/023ab706c84b6632b2c3fef4d70cb10aabec6038))
- **next:** display P-Bandai sub-brands as P-Bandai on item cards ([850673f](https://github.com/Mearman/hobby.ninja/commit/850673f3e3ceb34d3353478c4af9585bcf0eb82a))
- **next:** expand grade families when selecting all grades ([27783c7](https://github.com/Mearman/hobby.ninja/commit/27783c791aeff741f56fe9e9b8e2ed649c04648b))
- **next:** fix Select none not showing for grades filter ([b35b341](https://github.com/Mearman/hobby.ninja/commit/b35b3412d0b3e10b743abdf1297d3827cd19d256))
- **next:** make columns prop responsive with maxColumns ([513cf02](https://github.com/Mearman/hobby.ninja/commit/513cf02f6b71da363c13d40ac4de6d08669b27e6))
- **next:** restore title hover overlay on filter cards ([880034a](https://github.com/Mearman/hobby.ninja/commit/880034acb1a6e0954b8618bd2222e48ff078f2f1))
- **next:** show specific child grade instead of parent on item cards ([e59723c](https://github.com/Mearman/hobby.ninja/commit/e59723ccd5b6685f9b175af29c965d9482e67899))

### Refactoring

- **cli:** use exported APIs instead of private method access ([45e06de](https://github.com/Mearman/hobby.ninja/commit/45e06deadd2c51ea51f2b6ec9722258fa7365964))
- **scrapers:** apply lint fixes to base-scraper ([89c6288](https://github.com/Mearman/hobby.ninja/commit/89c628853c93e07dcdbb789ab7846aaae433ca1c))
- **scrapers:** apply lint fixes to core scrapers ([f37105c](https://github.com/Mearman/hobby.ninja/commit/f37105c6ee783926962968848945cdebab42f930))
- **scrapers:** apply lint fixes to index managers ([28b50a9](https://github.com/Mearman/hobby.ninja/commit/28b50a9f3e10a9d061634f784dc77d63a4ddf40f))
- **scrapers:** apply lint fixes to manual-downloader ([0b70462](https://github.com/Mearman/hobby.ninja/commit/0b70462a9d087197624b8c8df19c7c730c7592d6))
- **scrapers:** apply lint fixes to manual-parser ([cac1e3d](https://github.com/Mearman/hobby.ninja/commit/cac1e3dfe4c8ace69f73087550f61d59c6bd6b5d))
- **scrapers:** apply lint fixes to url-scanner ([cb6db8a](https://github.com/Mearman/hobby.ninja/commit/cb6db8ae01742b0f249566ecce66be312fce10ca))

### Styling

- **next:** make filter sections more vertically compact ([f9bb5dd](https://github.com/Mearman/hobby.ninja/commit/f9bb5dd865d79a9333ea2e9b662f7caf0f4dce16))

### Chores

- **assets:** consolidate 30ML category images ([9e887d9](https://github.com/Mearman/hobby.ninja/commit/9e887d99baa54e7f83b845a650f16b15ad3a9642))
- **assets:** replace pb.webp with pb.png ([4545b2d](https://github.com/Mearman/hobby.ninja/commit/4545b2d1f3c5bd78ea776b4971703ff6df9f806e))
- **data:** consolidate duplicate character plastic model category ([f4e0f4f](https://github.com/Mearman/hobby.ninja/commit/f4e0f4f208f5f9302afa78c18b234dd79668df0d))
- **data:** remove duplicate 30-minutes-label category ([a4e9a17](https://github.com/Mearman/hobby.ninja/commit/a4e9a17acf2f01a9ced2b12914c9c304ce143219))
- **data:** remove empty/duplicate categories (product-list, overall-top) ([8e166c5](https://github.com/Mearman/hobby.ninja/commit/8e166c5e7067b1a3dc24368dd5f246ba520ffcf1))
- **eslint:** add scrapers package tsconfig ([6b7937a](https://github.com/Mearman/hobby.ninja/commit/6b7937a8357ffb80b9afe997926dc01fea93078a))

## [1.0.1](https://github.com/Mearman/hobby.ninja/compare/v1.0.0...v1.0.1) (2025-12-28)

### Chores

- **release:** bootstrap v1.0.0 and restore release notes in commits ([7741be2](https://github.com/Mearman/hobby.ninja/commit/7741be2b86d70e40c18a30123545d34499bfc46f))
