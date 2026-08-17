---
name: source-roster
description: 公开信源：优先用内置的 AI、金融、科技公开信源，再抓原文
---

# 公开信源

整理 AI、金融、科技动态时使用本 skill。先从下面这份公开、可打开的信源动手，再用 `web_search` 补漏，每一条都用 `web_fetch` 打开原文。

用户没收窄范围时，三个领域都覆盖，时间默认大约最近一周。他指定主题、机构或更短窗口时，按他的范围，不要硬凑三个领域。

## 优先信源

**AI（开源项目与公开论文）**

- https://github.com/vllm-project/vllm/releases
- https://github.com/sgl-project/sglang/releases
- https://github.com/ggml-org/llama.cpp/releases
- https://github.com/huggingface/transformers/releases
- https://github.com/pytorch/pytorch/releases
- https://github.com/deepseek-ai
- https://huggingface.co/blog
- https://arxiv.org/list/cs.LG/recent
- https://arxiv.org/list/cs.CL/recent

**金融（开源工具与官方公开数据）**

- https://github.com/OpenBB-finance/OpenBB/releases
- https://github.com/ccxt/ccxt/releases
- https://github.com/lballabio/QuantLib/releases
- https://github.com/wilsonfreitas/awesome-quant
- https://fred.stlouisfed.org
- https://www.sec.gov/edgar

金融开源产品比 AI 少。没有抓到原文的条目不要写。不要根据搜索摘要给买卖建议或编造行情。

**科技（开源基础设施与官方发布）**

- https://github.com/trending
- https://github.com/kubernetes/kubernetes/releases
- https://github.com/nodejs/node/releases
- https://github.com/microsoft/TypeScript/releases
- https://blog.rust-lang.org
- https://www.cncf.io/blog

## 额外来源

用户点名的来源可以加进来，但必须同样是公开页面、官方渠道或开源仓库，并且 `web_fetch` 打得开。付费墙、需要登录的摘要、无法打开的转发，一律不用。

## 不要做的事

- 不要把搜索引擎摘要当成原文。
- 不要用封闭模型的营销稿顶替开源发布说明。
- 不要为了凑三个领域而写没有信源的条目。
