# Progress Peak

LM Progress — SaaS B2C de Progressão de Treino

1. Visão do produto

Crie um SaaS B2C chamado LM Progress.

O produto é destinado a indivíduos que já sabem montar e executar seus próprios treinos.

O usuário não recebe um treino pronto de um personal.

O usuário:

1. cria sua própria conta;

2. informa seus dados pessoais para contextualização;

3. monta seus próprios treinos;

4. define exercícios, séries, faixa de repetições e cargas;

5. executa os treinos;

6. registra o desempenho;

7. responde a um check-in de recuperação;

8. recebe recomendações automáticas de progressão.

Conceito central

“Você monta o treino. O LM Progress organiza sua progressão.”

O sistema deve funcionar como um motor de autoregulação e progressão de treinamento, e não como um gerador automático de fichas.

⸻

2. Público-alvo

Usuários que:

* treinam musculação;

* já sabem estruturar seus próprios treinos;

* querem acompanhar progressão;

* têm dificuldade em decidir quando aumentar carga;

* querem evitar progressão excessivamente agressiva;

* querem levar em consideração recuperação, estresse, sono e consistência.

O produto é B2C.

Não criar inicialmente:

* área para personal;

* cadastro de alunos;

* painel de profissionais;

* prescrição de treino por terceiros.

⸻

3. Princípio fundamental do algoritmo

A progressão deve ser individual por exercício.

Nunca assumir que todos os exercícios de um treino precisam progredir simultaneamente.

Exemplo:

* Extensora → progredir

* Agachamento → consolidar

* Leg press → progredir

* Mesa flexora → manter

* Stiff → recuperar

* Panturrilha → acumular repetições

Cada exercício possui seu próprio histórico e estado de progressão.

⸻

4. Cadastro do usuário

Criar cadastro com:

* Nome

* Idade

* Sexo

* Altura

* Peso

* Objetivo

* Nível de experiência

* Frequência semanal

Objetivos

* Hipertrofia

* Emagrecimento

* Recomposição corporal

* Força

* Manutenção

* Outro

Nível de experiência

* Iniciante

* Intermediário

* Avançado

Frequência

1 a 7 dias por semana.

Regra importante

Esses dados servem somente para contextualização.

Não usar automaticamente idade, sexo, peso, altura, objetivo ou experiência para determinar:

* carga;

* volume;

* aumento de carga;

* redução de carga;

* faixa de repetições;

* RIR.

As decisões de progressão devem ser baseadas principalmente no treino realmente executado, histórico, RIR, recuperação e consistência.

⸻

5. Montagem do treino

O usuário deve poder criar um treino.

Exemplo:

Treino A — Pernas

1. Extensora

2. Agachamento

3. Leg Press

4. Mesa Flexora

5. Stiff

6. Panturrilha Smith

Para cada exercício permitir configurar:

* nome;

* ordem;

* número de séries;

* repetição mínima;

* repetição máxima;

* carga atual;

* incremento de carga sugerido;

* RIR alvo.

Exemplo:

Extensora

3 séries

10–15 repetições

60 kg

incremento sugerido: 5 kg

RIR alvo: 2

⸻

6. Carga sugerida NÃO é carga obrigatória

Essa é uma regra fundamental do produto.

Quando o algoritmo determinar que existe condição para progressão, mostrar:

Sugestão de próxima carga: 65 kg

Mas permitir que o usuário altere.

Exemplo:

A academia pode possuir apenas:

60 kg → 65 kg

O sistema sugere 65 kg.

Mas o usuário pode decidir:

“Vou repetir 60 kg.”

Ou alterar para qualquer carga disponível.

Registrar separadamente

Salvar:

* carga anterior;

* carga sugerida pelo algoritmo;

* carga realmente utilizada;

* motivo/decisão, quando aplicável.

O sistema deve distinguir:

Sistema sugeriu: 65 kg

Usuário utilizou: 60 kg

A escolha do usuário nunca deve ser sobrescrita automaticamente.

⸻

7. Check-in pré-treino

Antes de iniciar o treino, mostrar um check-in rápido.

Perguntar:

Sono

Escala 1–5.

Energia

Escala 1–5.

Estresse

Escala 1–5.

Disposição para treinar

Escala 1–5.

Dor/desconforto

Escala 0–5.

Aderência da semana anterior

Escala 1–5 ou pergunta equivalente.

Adicionar campo opcional:

“Como você está se sentindo hoje?”

Objetivo

O check-in não determina sozinho a decisão.

Ele serve para contextualizar o desempenho.

Exemplo:

Se o usuário teve queda de performance e relata:

* sono ruim;

* estresse alto;

* energia baixa;

o sistema deve evitar interpretar automaticamente isso como necessidade de aumentar carga.

⸻

8. Execução do treino

Para cada exercício mostrar:

* nome;

* séries;

* faixa de repetições;

* carga sugerida;

* decisão atual;

* campos para registrar reps;

* campo de RIR por série.

Exemplo:

Extensora

60 kg

3 × 10–15

Série 1:

* reps

* RIR

Série 2:

* reps

* RIR

Série 3:

* reps

* RIR

⸻

9. Motor de decisão

Criar inicialmente um motor determinístico e explicável.

Não utilizar uma IA generativa para decidir arbitrariamente a progressão.

Cada decisão deve poder ser explicada.

Estados possíveis:

🟢 PROGREDIR

Quando o usuário:

* atinge o topo da faixa de repetições;

* mantém esforço compatível com o RIR alvo;

* demonstra boa recuperação;

* não apresenta sinais relevantes de queda persistente de performance.

Exemplo:

60 kg

15 / 15 / 15

RIR:

2 / 2 / 1

Resultado:

Progressão disponível

Sugestão:

65 kg

⸻

🔵 ACUMULAR REPETIÇÕES

Quando ainda existe espaço dentro da faixa de reps.

Exemplo:

60 kg

12 / 12 / 11

Resultado:

Mantenha 60 kg e tente acumular mais repetições.

⸻

🟡 CONSOLIDAR / REPETIR

Quando a recuperação está intermediária ou a performance ainda não justifica progressão.

Resultado:

Repita a carga atual.

Não considerar isso uma falha.

A ideia é permitir progresso com constância.

⸻

🔴 RECUPERAR / REDUZIR EXIGÊNCIA

Quando houver sinais relevantes de baixa recuperação ou queda persistente de desempenho.

Exemplos:

* dor elevada;

* energia muito baixa;

* queda de performance em sessões consecutivas;

* recuperação ruim combinada com desempenho ruim.

O sistema deve recomendar manutenção ou redução da exigência, conforme as regras configuradas.

⸻

10. Queda persistente de performance

Não tratar uma sessão ruim isolada como regressão.

Exemplo:

Sessão 1:

50 kg — 12/12/11

Sessão 2:

50 kg — 10/10/9

Isso não deve automaticamente gerar redução.

Porém, se houver queda persistente:

Sessão 1:

12/12/11

Sessão 2:

10/10/9

Sessão 3:

9/9/8

O sistema deve identificar uma possível tendência de queda.

Mostrar algo como:

Performance em queda

A carga está sendo mantida, mas seu desempenho caiu em sessões consecutivas. Priorize recuperação e consolide o movimento antes de buscar nova progressão.

⸻

11. Ordem dos exercícios

A posição do exercício no treino deve ser armazenada.

O sistema deve reconhecer que um exercício executado no final do treino pode ter desempenho inferior por causa da fadiga acumulada.

Portanto:

não comparar diretamente a performance de exercícios em posições diferentes como se estivessem em condições equivalentes.

O histórico deve ser comparado principalmente com o próprio histórico daquele exercício na mesma posição/estrutura de treino.

⸻

12. Progressão não significa somente aumento de carga

O motor pode recomendar:

Aumentar carga

60 → 65 kg

Manter carga e aumentar reps

60 kg novamente, buscando 13–15 reps.

Repetir carga

Consolidar 60 kg.

Reduzir exigência

Recuperar performance antes de continuar a progressão.

Isso é essencial.

⸻

13. Cinco telas principais

Tela 1 — Dashboard

Mostrar:

* saudação;

* próximo treino;

* status de prontidão;

* quantidade de treinos registrados;

* resumo da progressão;

* botão “Começar treino”.

Exemplo:

Boa tarde, Lucas

Hoje: Treino A — Pernas

Prontidão: Boa

12 treinos registrados

[Começar treino]

⸻

14. Tela 2 — Meus treinos

Mostrar os treinos criados pelo usuário.

Exemplo:

Treino A — Pernas

6 exercícios.

Cada exercício mostra:

* ordem;

* nome;

* séries;

* faixa de reps;

* carga;

* RIR.

Permitir:

* adicionar exercício;

* editar;

* excluir;

* alterar ordem;

* editar parâmetros.

⸻

15. Tela 3 — Treino de hoje

Fluxo:

Etapa A

Check-in.

Etapa B

Mostrar exercícios.

Etapa C

Para cada exercício mostrar a recomendação.

Exemplo:

Extensora

Última carga: 60 kg

3 × 10–15

🟢 PROGREDIR

Sugestão: 65 kg

[Editar carga]

Depois o usuário registra:

* carga realmente utilizada;

* reps de cada série;

* RIR de cada série.

Ao terminar:

Finalizar treino

⸻

16. Tela 4 — Progressão

Mostrar evolução individual por exercício.

Para cada exercício:

* última carga;

* carga sugerida;

* carga realmente utilizada;

* reps;

* RIR;

* histórico;

* estado atual.

Criar gráficos simples:

Carga ao longo do tempo

Repetições ao longo do tempo

Volume ao longo do tempo

O gráfico deve servir para visualizar tendência, não para determinar sozinho a progressão.

⸻

17. Tela 5 — Perfil

Mostrar:

* Nome

* Idade

* Sexo

* Altura

* Peso

* Objetivo

* Experiência

* Frequência semanal

Adicionar texto:

Esses dados contextualizam sua experiência no LM Progress. As decisões de progressão são baseadas principalmente no seu desempenho real e histórico de treino.

⸻

18. Banco de dados

Utilizar Supabase para backend.

Criar autenticação por e-mail/senha.

Estrutura inicial:

users / profiles

* id

* name

* age

* sex

* height

* weight

* goal

* experience_level

* weekly_frequency

* created_at

* updated_at

workouts

* id

* user_id

* name

* created_at

* updated_at

workout_exercises

* id

* workout_id

* exercise_name

* position

* sets

* min_reps

* max_reps

* current_load

* suggested_increment

* target_rir

* created_at

* updated_at

training_sessions

* id

* user_id

* workout_id

* started_at

* completed_at

* sleep_score

* energy_score

* stress_score

* disposition_score

* pain_score

* adherence_score

exercise_performance

* id

* session_id

* workout_exercise_id

* suggested_load

* actual_load

* decision

* created_at

set_performance

* id

* exercise_performance_id

* set_number

* reps

* rir

⸻

19. Segurança

Cada usuário só pode acessar seus próprios:

* dados;

* treinos;

* sessões;

* performances;

* histórico.

Implementar Supabase Row Level Security (RLS).

Nenhum usuário pode consultar dados de outro usuário.

⸻

20. Interface

Criar uma interface:

* moderna;

* minimalista;

* premium;

* responsiva;

* mobile-first;

* adequada para uso durante o treino.

Estética inspirada em produtos SaaS modernos.

Usar:

* fundo claro;

* branco;

* cinza;

* azul como cor principal;

* verde para progressão;

* amarelo para manutenção/consolidação;

* vermelho para recuperação/atenção.

Evitar visual de aplicativo de academia genérico.

A interface deve parecer um produto tecnológico de alta qualidade.

⸻

21. Princípio de UX

Durante o treino, o usuário não deve precisar ficar navegando por várias telas.

O fluxo deve ser:

Check-in → Exercício → Séries → Próximo exercício → Finalizar

O sistema deve salvar automaticamente o progresso para evitar perda de dados.

⸻

22. Explicabilidade

Toda recomendação deve possuir uma justificativa curta.

Exemplo:

PROGREDIR

“Você atingiu o topo da faixa em todas as séries e manteve esforço próximo do RIR alvo.”

Ou:

CONSOLIDAR

“Sua recuperação está intermediária. Vamos repetir a carga para consolidar sua performance.”

Ou:

ACUMULAR REPS

“Ainda existe espaço dentro da faixa de repetições. Mantenha a carga e busque mais repetições.”

⸻

23. Regra de autonomia do usuário

O usuário sempre pode:

* alterar a carga sugerida;

* repetir a carga;

* registrar a carga realmente disponível;

* executar menos/more reps do que o planejado;

* registrar RIR diferente do alvo.

O sistema não deve impedir o usuário de treinar porque a recomendação automática é diferente.

O algoritmo é um assistente de progressão, não uma autoridade.

⸻

24. Persistência

Todas as informações devem ser armazenadas no Supabase.

Não utilizar somente localStorage na versão SaaS.

O usuário deve conseguir:

* sair;

* entrar novamente;

* acessar seus dados;

* continuar o histórico;

* utilizar outro dispositivo.

⸻

25. Arquitetura

Criar a aplicação com arquitetura organizada para futura expansão.

Separar:

* UI;

* autenticação;

* banco;

* regras de progressão;

* histórico;

* componentes;

* tipos/interfaces.

O motor de progressão deve ficar isolado em uma camada própria para poder ser aprimorado posteriormente sem reconstruir toda a interface.

⸻

26. O que NÃO implementar agora

Não criar neste MVP:

* marketplace;

* personal trainer;

* dieta;

* integração com smartwatch;

* integração com Apple Health;

* integração com Google Fit;

* comunidade;

* ranking;

* gamificação complexa;

* IA conversacional;

* geração automática de treinos;

* prescrição médica;

* suplementos;

* pagamentos complexos.

O foco é:

TREINO → REGISTRO → CONTEXTO → DESEMPENHO → PROGRESSÃO

⸻

27. Preparação para SaaS

Embora o MVP inicial possa começar com uma única experiência de usuário, estruturar o backend para suportar:

* múltiplos usuários;

* autenticação;

* planos;

* assinatura;

* limites de uso;

* futuras funcionalidades premium.

Não implementar cobrança agora, mas não criar uma arquitetura que impeça sua implementação futura.

⸻

28. Critério de sucesso do MVP

O MVP estará correto quando um usuário conseguir:

1. criar uma conta;

2. preencher seu perfil;

3. montar um treino;

4. definir suas cargas;

5. iniciar um treino;

6. responder ao check-in;

7. executar e registrar as séries;

8. receber uma recomendação de progressão;

9. alterar a carga sugerida;

10. finalizar o treino;

11. visualizar o histórico;

12. retornar posteriormente e continuar a progressão.

O sistema deve demonstrar claramente que:

A recomendação é baseada no histórico real do usuário e pode ser aceita ou modificada pelo próprio usuário.

Frase principal do produto

Você treina. Você decide o treino. O LM Progress cuida da progressão.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/32699a77-25cf-4613-bdcc-47254b77bec6).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
