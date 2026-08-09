A lot of the architecture for this bot was written entirely as flowcharts. I have not written a flowchart since I was in elementary school, but I understand why many programmers swear by them.

# Auto-GM

I am a very busy person IRL, and while I can certainly make time to host live events on the evenings, there are cases where I want my players to do things without my supervision, but _not_ without my supervision, you know? I want them to be able to discover things while I'm away...

This is inspired by Ultimate Assitant's truth bullet mechanics, but is meant to work alongside the current roleplay meta (which is to use Tupperbox.) "Bullets" (investigate prompts) won't just appear during a murder case, they can appear even outside. All it takes is the right aliases to find them.

## Core objective

An asynchronous investigation system that handles prompt serving, player roll parsing (with proxy fallbacks), and automated state progression via Discord without requiring live GM oversight.

```mermaid
flowchart TD
    start --> A:::gm -- Publish to DB --> B:::play
    B --> C -- if within next 12 mins --> D1:::play
    D1-->D.intermission-- Yes -->E-->F-->G-->END
    D.intermission-- No -->D.resolve-->E
    C -- upon timeout--> D2
    D2 --> D2.a
    D2.a --> D2.a.1:::play -- if >90 mins since serving --> C
    D2.a.1 -- if <90 minutes since serving --> C.b --> D1
    D2.a --> D2.a.2:::play --> E.b
    D2.a --> D2.a.3:::play --> E.b
    E.b --> END
    start([START])
    A[/GM defines<br/> investigation points/]
    B[/Player queries points in<br/> different channel/]
    C[Game serves investigation prompt]
    C.b[Game links to investigation<br/> prompt and requests roll]
    D1[/Player rolls using Tupperbox webhook/]
    D.intermission@{shape: diamond, label: Does Tupperbox render the webhook in <=3 seconds?}
    D.resolve[Game steps in to resolve<br/> roll for player]
    E[Game collects roll result and records<br/>to Google Sheet]
    F[Game computes roll result]
    G[Game renders roll result<br/> and makes state changes if needed]
    D2[Game terminates<br/> investigation action]
    D2.a@{shape: diamond, label: Game offers<br/> control reactions}
    D2.a.1[/Player reacts ✅<br/> within 12 hours/]
    D2.a.2[/Player reacts ❌/]
    D2.a.3[/12 hours pass<br/>without reaction/]
    E.b[Investigation step fully aborts]
    END([END])
    classDef gm stroke:blue
    classDef play stroke:orange
```
