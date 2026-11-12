import{r as e}from"./rolldown-runtime-XKyaHtl9.js";import{t}from"./jsx-runtime-LKYXHABd.js";var n=e(t()),r={title:`CorridorFlow API`},i=`# CorridorFlow API [#corridorflow-api]

This portal documents the API used by the CorridorFlow demonstration. The reference and interactive playground are generated from the repository's root \`openapi.yaml\` file.

## Get started [#get-started]

1. Call \`POST /auth/login\` with a configured demo operator and password.
2. Send the returned bearer token in the \`Authorization\` header for protected endpoints.
3. Use the API reference to inspect trade, PayPal Sandbox, and optional Hyperledger Fabric operations.

## Demo safety [#demo-safety]

This is a hackathon prototype. PayPal operations use Sandbox or simulation mode. Fabric write endpoints can submit permanent transactions to the configured test ledger and additionally require the server's Fabric write token. Never place passwords, PayPal credentials, or Fabric write tokens in public client code or API examples.
`,a={contents:[{heading:`corridorflow-api`,content:"This portal documents the API used by the CorridorFlow demonstration. The reference and interactive playground are generated from the repository's root `openapi.yaml` file."},{heading:`get-started`,content:"Call `POST /auth/login` with a configured demo operator and password."},{heading:`get-started`,content:"Send the returned bearer token in the `Authorization` header for protected endpoints."},{heading:`get-started`,content:`Use the API reference to inspect trade, PayPal Sandbox, and optional Hyperledger Fabric operations.`},{heading:`demo-safety`,content:`This is a hackathon prototype. PayPal operations use Sandbox or simulation mode. Fabric write endpoints can submit permanent transactions to the configured test ledger and additionally require the server's Fabric write token. Never place passwords, PayPal credentials, or Fabric write tokens in public client code or API examples.`}],headings:[{id:`corridorflow-api`,content:`CorridorFlow API`},{id:`get-started`,content:`Get started`},{id:`demo-safety`,content:`Demo safety`}]},o=[{depth:1,url:`#corridorflow-api`,title:(0,n.jsx)(n.Fragment,{children:`CorridorFlow API`})},{depth:2,url:`#get-started`,title:(0,n.jsx)(n.Fragment,{children:`Get started`})},{depth:2,url:`#demo-safety`,title:(0,n.jsx)(n.Fragment,{children:`Demo safety`})}];function s(e){let t={code:`code`,h1:`h1`,h2:`h2`,li:`li`,ol:`ol`,p:`p`,...e.components};return(0,n.jsxs)(n.Fragment,{children:[(0,n.jsx)(t.h1,{id:`corridorflow-api`,children:`CorridorFlow API`}),`
`,(0,n.jsxs)(t.p,{children:[`This portal documents the API used by the CorridorFlow demonstration. The reference and interactive playground are generated from the repository's root `,(0,n.jsx)(t.code,{children:`openapi.yaml`}),` file.`]}),`
`,(0,n.jsx)(t.h2,{id:`get-started`,children:`Get started`}),`
`,(0,n.jsxs)(t.ol,{children:[`
`,(0,n.jsxs)(t.li,{children:[`Call `,(0,n.jsx)(t.code,{children:`POST /auth/login`}),` with a configured demo operator and password.`]}),`
`,(0,n.jsxs)(t.li,{children:[`Send the returned bearer token in the `,(0,n.jsx)(t.code,{children:`Authorization`}),` header for protected endpoints.`]}),`
`,(0,n.jsx)(t.li,{children:`Use the API reference to inspect trade, PayPal Sandbox, and optional Hyperledger Fabric operations.`}),`
`]}),`
`,(0,n.jsx)(t.h2,{id:`demo-safety`,children:`Demo safety`}),`
`,(0,n.jsx)(t.p,{children:`This is a hackathon prototype. PayPal operations use Sandbox or simulation mode. Fabric write endpoints can submit permanent transactions to the configured test ledger and additionally require the server's Fabric write token. Never place passwords, PayPal credentials, or Fabric write tokens in public client code or API examples.`})]})}function c(e={}){let{wrapper:t}=e.components||{};return t?(0,n.jsx)(t,{...e,children:(0,n.jsx)(s,{...e})}):s(e)}export{i as _markdown,c as default,r as frontmatter,a as structuredData,o as toc};