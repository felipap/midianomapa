
# Midia No Mapa

### Acompanhe Ninjas e Manifestações pelo Brasil.

<del>Projetinho do feriado.</deç>

## Ro-dando, ro-dando! ([hehe](https://github-camo.global.ssl.fastly.net/fab0d01e7873ccee9b9ce070237f240b0f83b881/687474703a2f2f7777772e746974656c6164656672616e676f2e636f6d2f77702d636f6e74656e742f75706c6f6164732f323031332f30342f74756d626c725f6c786a7631614b73624531716b3470357a6f315f3235302e676966))

No diretório principal, crie um arquivo env.js com as seguinte chaves:

```
process.env.facebook_app_id
process.env.facebook_secreet
process.env.facebook_app_access_token
process.env.facebook_perm_access_token
process.env.twitter_consumer_key
process.env.twitter_consumer_secret
```
Elas serão usadas pelo programa na interação com login pelo facebook e twitter.

Baixe os pacotes necessários através usando `npm install`

Rode o express usando `grunt serve`

## TODOs:

[/] Document, continuously.

[ ] Improve spam/off-topic filtering.

[x] Add spam/off-topic filtering.

[ ] Filters to prevent people from putting their streams in wrong places.

[ ] Add "últimos eventos adicionados" to homepage.

[ ] Send user's coord with add-event requests to better filter the event's location. (?)

[x] Memcached, please.

[x] Ninjas!

[x] Grunt, please.

[x] Add statistics to main page.


Here, have an xkcd cartoon:

![](http://i.imgur.com/KlAGLZz.jpg)
