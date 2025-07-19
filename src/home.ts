export function buildHome(): string {
  return `
Axiom, Inc.                                GitHub    OpenAPI    Explorer
────────────────────────────────────────────────────────────────────────


      ███╗   ███╗ ██████╗ ██████╗ ███████╗██╗     ██████╗ ██████╗
      ████╗ ████║██╔═══██╗██╔══██╗██╔════╝██║     ██╔══██╗██╔══██╗
      ██╔████╔██║██║   ██║██║  ██║█████╗  ██║     ██║  ██║██████╔╝
      ██║╚██╔╝██║██║   ██║██║  ██║██╔══╝  ██║     ██║  ██║██╔══██╗
      ██║ ╚═╝ ██║╚██████╔╝██████╔╝███████╗███████╗██████╔╝██████╔╝
      ╚═╝     ╚═╝ ╚═════╝ ╚═════╝ ╚══════╝╚══════╝╚═════╝ ╚═════╝


────────────────────────────────────────────────────────────────────────

API for AI model information {provider,prices,context,features, [...]}
  - Completely free to use
  - Open source, based on the LiteLLM project models_and_prices.json
  - JSON and CSV support
  - Optimized for apps and data workloads
  - Filtering and field projection
  - OpenAPI specification and explorer

────────────────────────────────────────────────────────────────────────
provider            model              input cost            max input
                                       output cost           max output
────────────────────────────────────────────────────────────────────────

OpenAI              gpt-4              0.0020              10000
                                       0.0020              10000

                    ────────────────────────────────────────────────────

                    gpt-3.5-turbo      0.0020              10000
                                       0.0020              10000

                    ────────────────────────────────────────────────────

                    gpt-3.5-turbo 	   0.0020              10000
                                       0.0020              10000

	`.replace('\t', '  ');
}
