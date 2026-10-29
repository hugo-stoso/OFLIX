# Semântica de remuneração observada

Auditoria determinística realizada na camada pública dos conectores e nos fixtures da demonstração.

| Fonte | Campo observado | Semântica comprovada | Tratamento |
| --- | --- | --- | --- |
| GO Sergipe | `item.salary` | O anúncio publica um valor textual; a resposta não fornece periodicidade no campo auditado | Conta como remuneração publicada, fica `UNKNOWN` e não entra nos agregados mensais |
| EmpregAju | remuneração exibida no card | O parser encontra valor em reais, mas não encontra marcador mensal na publicação auditada | Conta como remuneração publicada, fica `UNKNOWN` e não entra nos agregados mensais |
| IEL Sergipe | remuneração exibida na listagem | O parser encontra valor em reais; a listagem auditada não explicita periodicidade | Conta como remuneração publicada, fica `UNKNOWN` e não entra nos agregados mensais |
| OFLIX | `compensation.period` | O contrato interno aceita somente `MONTHLY` | Entra nas estatísticas mensais |

Não há inferência de periodicidade por plausibilidade numérica. Somente `compensation.period === MONTHLY`, `salaryPeriod === MONTHLY` ou semântica estruturada equivalente permite comparação mensal. A média e a mediana mensais da pesquisa por município só são expostas com pelo menos três observações mensais comparáveis; abaixo desse limite a interface mostra os anúncios reais, com fonte e periodicidade desconhecida quando aplicável.
