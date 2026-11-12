import{r as e}from"./rolldown-runtime-XKyaHtl9.js";import{t}from"./jsx-runtime-LKYXHABd.js";import{n,t as r}from"./server.browser-CRtpYEZZ.js";var i=e(t()),a={title:`TypeScript SDK`,description:`Install and start using the TypeScript SDK.`};function o(e){if(!r())return null;let t=n(e.components);return(0,i.jsxs)(i.Fragment,{children:[(0,i.jsx)(t.SdkActions,{download:`/__downloads/sdk/typescript.zip`,source:``,packageUrl:``,registry:``}),`

## Intro [#intro]

The CorridorFlow - Cross-Border Trade Prototype API SDK provides access to the CorridorFlow - Cross-Border Trade Prototype API REST APIs.

Hackathon prototype API for the CorridorFlow web demo, combining a PostgreSQL-backed demo trade workflow, deterministic corridor rules, optional Gemini explanations, and PayPal Developer Platform (Orders v2, Payouts v1) Sandbox or simulation. Password-protected demo roles use expiring bearer sessions stored in PostgreSQL when configured. This prototype access layer is not a production identity system.

## Installation [#installation]

The SDK compiles to \`dist/\` before it can be referenced — run its \`build\` script once in the SDK folder, then add it to your project by path:

\`\`\`bash
npm install <path-to-sdk>
\`\`\`

## Quick Start [#quick-start]

Create one client and reuse it. Configure its behaviour through \`ClientOptions\`.

\`\`\`ts
import {
  CorridorFlowCrossBorderTradePrototypeApiClient,
  ServerEnvironment,
} from "corridor-flow-cross-border-trade-prototype-api";

const client = new CorridorFlowCrossBorderTradePrototypeApiClient({
  serverEnvironment: ServerEnvironment.Production,
  bearerAuth: "YOUR_BEARER_TOKEN",
});
\`\`\`

Nothing in \`ClientOptions\` is required — \`new CorridorFlowCrossBorderTradePrototypeApiClient()\` compiles — and each option left out falls back to its default. \`serverEnvironment\` is spelled out above so the environment a call reaches is visible where the client is built rather than inherited silently.

### From CommonJS [#from-commonjs]

The package ships both dialects from a single entry, so \`require\` works with full types. In a TypeScript CommonJS file use the \`import ... = require(...)\` form — a plain destructuring \`require\` runs fine but gives you \`any\`.

\`\`\`ts
import sdk = require("corridor-flow-cross-border-trade-prototype-api");

const client = new sdk.CorridorFlowCrossBorderTradePrototypeApiClient({
  serverEnvironment: sdk.ServerEnvironment.Production,
  bearerAuth: "YOUR_BEARER_TOKEN",
});
\`\`\`
`]})}var s={contents:[{heading:`intro`,content:`The CorridorFlow - Cross-Border Trade Prototype API SDK provides access to the CorridorFlow - Cross-Border Trade Prototype API REST APIs.`},{heading:`intro`,content:`Hackathon prototype API for the CorridorFlow web demo, combining a PostgreSQL-backed demo trade workflow, deterministic corridor rules, optional Gemini explanations, and PayPal Developer Platform (Orders v2, Payouts v1) Sandbox or simulation. Password-protected demo roles use expiring bearer sessions stored in PostgreSQL when configured. This prototype access layer is not a production identity system.`},{heading:`installation`,content:"The SDK compiles to `dist/` before it can be referenced — run its `build` script once in the SDK folder, then add it to your project by path:"},{heading:`quick-start`,content:"Create one client and reuse it. Configure its behaviour through `ClientOptions`."},{heading:`quick-start`,content:"Nothing in `ClientOptions` is required — `new CorridorFlowCrossBorderTradePrototypeApiClient()` compiles — and each option left out falls back to its default. `serverEnvironment` is spelled out above so the environment a call reaches is visible where the client is built rather than inherited silently."},{heading:`from-commonjs`,content:"The package ships both dialects from a single entry, so `require` works with full types. In a TypeScript CommonJS file use the `import ... = require(...)` form — a plain destructuring `require` runs fine but gives you `any`."}],headings:[{id:`intro`,content:`Intro`},{id:`installation`,content:`Installation`},{id:`quick-start`,content:`Quick Start`},{id:`from-commonjs`,content:`From CommonJS`}]},c=[{depth:2,url:`#intro`,title:(0,i.jsx)(i.Fragment,{children:`Intro`})},{depth:2,url:`#installation`,title:(0,i.jsx)(i.Fragment,{children:`Installation`})},{depth:2,url:`#quick-start`,title:(0,i.jsx)(i.Fragment,{children:`Quick Start`})},{depth:3,url:`#from-commonjs`,title:(0,i.jsx)(i.Fragment,{children:`From CommonJS`})}];function l(e){let t={code:`code`,h2:`h2`,h3:`h3`,p:`p`,pre:`pre`,span:`span`,...e.components},{SdkActions:n}=t;return n||d(`SdkActions`,!0),(0,i.jsxs)(i.Fragment,{children:[(0,i.jsx)(n,{download:`/__downloads/sdk/typescript.zip`,source:``,packageUrl:``,registry:``}),`
`,(0,i.jsx)(t.h2,{id:`intro`,children:`Intro`}),`
`,(0,i.jsx)(t.p,{children:`The CorridorFlow - Cross-Border Trade Prototype API SDK provides access to the CorridorFlow - Cross-Border Trade Prototype API REST APIs.`}),`
`,(0,i.jsx)(t.p,{children:`Hackathon prototype API for the CorridorFlow web demo, combining a PostgreSQL-backed demo trade workflow, deterministic corridor rules, optional Gemini explanations, and PayPal Developer Platform (Orders v2, Payouts v1) Sandbox or simulation. Password-protected demo roles use expiring bearer sessions stored in PostgreSQL when configured. This prototype access layer is not a production identity system.`}),`
`,(0,i.jsx)(t.h2,{id:`installation`,children:`Installation`}),`
`,(0,i.jsxs)(t.p,{children:[`The SDK compiles to `,(0,i.jsx)(t.code,{children:`dist/`}),` before it can be referenced — run its `,(0,i.jsx)(t.code,{children:`build`}),` script once in the SDK folder, then add it to your project by path:`]}),`
`,(0,i.jsx)(i.Fragment,{children:(0,i.jsx)(t.pre,{className:`shiki shiki-themes github-light github-dark`,style:{"--shiki-light":`#24292e`,"--shiki-dark":`#e1e4e8`,"--shiki-light-bg":`#fff`,"--shiki-dark-bg":`#24292e`},tabIndex:`0`,title:`Terminal`,children:(0,i.jsx)(t.code,{children:(0,i.jsxs)(t.span,{className:`line`,children:[(0,i.jsx)(t.span,{style:{"--shiki-light":`#6F42C1`,"--shiki-dark":`#B392F0`},children:`npm`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:` install`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:` <`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:`path-to-sd`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:`k`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:`>`})]})})})}),`
`,(0,i.jsx)(t.h2,{id:`quick-start`,children:`Quick Start`}),`
`,(0,i.jsxs)(t.p,{children:[`Create one client and reuse it. Configure its behaviour through `,(0,i.jsx)(t.code,{children:`ClientOptions`}),`.`]}),`
`,(0,i.jsx)(i.Fragment,{children:(0,i.jsx)(t.pre,{className:`shiki shiki-themes github-light github-dark`,style:{"--shiki-light":`#24292e`,"--shiki-dark":`#e1e4e8`,"--shiki-light-bg":`#fff`,"--shiki-dark-bg":`#24292e`},tabIndex:`0`,title:`TypeScript`,children:(0,i.jsxs)(t.code,{children:[(0,i.jsxs)(t.span,{className:`line`,children:[(0,i.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:`import`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:` {`})]}),`
`,(0,i.jsx)(t.span,{className:`line`,children:(0,i.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:`  CorridorFlowCrossBorderTradePrototypeApiClient,`})}),`
`,(0,i.jsx)(t.span,{className:`line`,children:(0,i.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:`  ServerEnvironment,`})}),`
`,(0,i.jsxs)(t.span,{className:`line`,children:[(0,i.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:`} `}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:`from`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:` "corridor-flow-cross-border-trade-prototype-api"`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:`;`})]}),`
`,(0,i.jsx)(t.span,{className:`line`}),`
`,(0,i.jsxs)(t.span,{className:`line`,children:[(0,i.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:`const`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#005CC5`,"--shiki-dark":`#79B8FF`},children:` client`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:` =`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:` new`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#6F42C1`,"--shiki-dark":`#B392F0`},children:` CorridorFlowCrossBorderTradePrototypeApiClient`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:`({`})]}),`
`,(0,i.jsx)(t.span,{className:`line`,children:(0,i.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:`  serverEnvironment: ServerEnvironment.Production,`})}),`
`,(0,i.jsxs)(t.span,{className:`line`,children:[(0,i.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:`  bearerAuth: `}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:`"YOUR_BEARER_TOKEN"`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:`,`})]}),`
`,(0,i.jsx)(t.span,{className:`line`,children:(0,i.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:`});`})})]})})}),`
`,(0,i.jsxs)(t.p,{children:[`Nothing in `,(0,i.jsx)(t.code,{children:`ClientOptions`}),` is required — `,(0,i.jsx)(t.code,{children:`new CorridorFlowCrossBorderTradePrototypeApiClient()`}),` compiles — and each option left out falls back to its default. `,(0,i.jsx)(t.code,{children:`serverEnvironment`}),` is spelled out above so the environment a call reaches is visible where the client is built rather than inherited silently.`]}),`
`,(0,i.jsx)(t.h3,{id:`from-commonjs`,children:`From CommonJS`}),`
`,(0,i.jsxs)(t.p,{children:[`The package ships both dialects from a single entry, so `,(0,i.jsx)(t.code,{children:`require`}),` works with full types. In a TypeScript CommonJS file use the `,(0,i.jsx)(t.code,{children:`import ... = require(...)`}),` form — a plain destructuring `,(0,i.jsx)(t.code,{children:`require`}),` runs fine but gives you `,(0,i.jsx)(t.code,{children:`any`}),`.`]}),`
`,(0,i.jsx)(i.Fragment,{children:(0,i.jsx)(t.pre,{className:`shiki shiki-themes github-light github-dark`,style:{"--shiki-light":`#24292e`,"--shiki-dark":`#e1e4e8`,"--shiki-light-bg":`#fff`,"--shiki-dark-bg":`#24292e`},tabIndex:`0`,title:`TypeScript`,children:(0,i.jsxs)(t.code,{children:[(0,i.jsxs)(t.span,{className:`line`,children:[(0,i.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:`import`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:` sdk `}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:`=`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:` require`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:`(`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:`"corridor-flow-cross-border-trade-prototype-api"`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:`);`})]}),`
`,(0,i.jsx)(t.span,{className:`line`}),`
`,(0,i.jsxs)(t.span,{className:`line`,children:[(0,i.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:`const`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#005CC5`,"--shiki-dark":`#79B8FF`},children:` client`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:` =`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:` new`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:` sdk.`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#6F42C1`,"--shiki-dark":`#B392F0`},children:`CorridorFlowCrossBorderTradePrototypeApiClient`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:`({`})]}),`
`,(0,i.jsx)(t.span,{className:`line`,children:(0,i.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:`  serverEnvironment: sdk.ServerEnvironment.Production,`})}),`
`,(0,i.jsxs)(t.span,{className:`line`,children:[(0,i.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:`  bearerAuth: `}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:`"YOUR_BEARER_TOKEN"`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:`,`})]}),`
`,(0,i.jsx)(t.span,{className:`line`,children:(0,i.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:`});`})})]})})})]})}function u(e={}){let{wrapper:t}=e.components||{};return t?(0,i.jsx)(t,{...e,children:(0,i.jsx)(l,{...e})}):l(e)}function d(e,t){throw Error(`Expected `+(t?`component`:`object`)+" `"+e+"` to be defined: you likely forgot to import, pass, or provide it.")}export{o as _markdown,u as default,a as frontmatter,s as structuredData,c as toc};