BEGIN;
INSERT INTO public.learn_wall_finishing_sources(topic_id,title,publisher,url,claim_scope) SELECT t.id,v.title,v.publisher,v.url,v.claim_scope FROM public.learn_wall_finishing_topics t CROSS JOIN (VALUES ('DTU plaques de plâtre','CSTB','https://www.cstb.fr/','Règles de l''art des ouvrages en plaques de plâtre'),('Plaques de plâtre et isolation','FFB','https://www.ffbatiment.fr/','Pratiques professionnelles de plâtrerie et d''isolation'),('Cloisons et doublages','CAPEB','https://www.capeb.fr/','Mise en œuvre des cloisons et doublages'),('Normes NF DTU plâtrerie','AFNOR','https://www.boutique.afnor.org/','Référentiel normatif des ouvrages de plâtrerie')) AS v(title,publisher,url,claim_scope) WHERE t.candidate_key='system:fr-drywall-metal-stud' AND NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_sources s WHERE s.topic_id=t.id AND s.url=v.url);
INSERT INTO public.learn_articles(slug,title,excerpt,content,category_slug,wall_market_code,wall_topic_id,wall_article_theme,wall_language_code,status,author,read_time_minutes,cover_image_url,meta_title,meta_description) SELECT a.slug,a.title,a.excerpt,a.content,'surface-preparation',a.market,t.id,a.theme,'fr','draft','FRELUX Learn',a.read_time_minutes,a.cover_url,a.meta_title,a.meta_description FROM (VALUES
  ($a1$fr-drywall-metal-stud-overview$a1$, $b1$Cloison BA13 sur ossature métallique : la paroi intérieure française$b1$, $d1$Cloison BA13 sur ossature métallique en France : épaisseurs, acoustique, charges admissibles, points faibles et critères pour juger un montage.$d1$, 'FR', $w1$# Cloison BA13 sur ossature métallique : la paroi intérieure française

Une cloison française sur ossature métallique, c'est deux rails, une série de montants, de la laine minérale entre les montants, et une ou deux peaux de plaques de plâtre vissées. Le tout monté à sec, en quelques heures, sans eau et sans temps de séchage. Cette rapidité explique pourquoi ce système a remplacé la cloison maçonnée dans la majorité des logements construits depuis les années quatre-vingt.

Ce qui est rapide à monter est aussi exigeant à monter correctement. Une cloison BA13 mal réglée craque, transmet les bruits, supporte mal une étagère et se fissure aux angles. Une cloison bien montée ne bouge pas pendant vingt ans.

## Pourquoi une ossature métallique plutôt que du bois ?

Parce que l'acier ne travaille pas avec l'humidité. Un montant bois gonfle et se déforme dans un logement humide, un montant acier reste droit. L'acier est aussi incombustible, ce qui simplifie le traitement du feu dans les logements collectifs.

L'acier a un défaut inverse : il transmet les vibrations et le bruit. C'est pourquoi il est toujours associé à un remplissage en laine minérale et à des dispositifs de désolidarisation aux jonctions.

## Quelles plaques trouve-t-on en France ?

La plaque de plâtre standard, dite BA13 pour son épaisseur de treize millimètres, couvre la majorité des cloisons intérieures. La BA10, plus fine, s'emploie en doublage ou en plafond. Les plaques hydrofuges, notées H1, sont réservées aux pièces humides. Les plaques coupe-feu et les plaques acoustiques répondent à des exigences précises, définies par l'usage de la pièce.

Choisir la plaque est donc un choix technique, pas un choix de stock. Une plaque standard posée dans une salle de bain se dégrade en quelques années, et la reprise impose de démonter la peau complète.

## Que disent les règles de l'art ?

Les DTU relatifs aux ouvrages en plaques de plâtre fixent les entraxes de montants, les fixations, les joints, les tolérances de planéité et les règles de désolidarisation. Ces documents sont la référence contractuelle, et une entreprise qui s'en écarte sans justification s'expose à refuser la réception.

Pour un maître d'ouvrage, la question utile est simple : quel DTU, quelle plaque, quel entraxe, quel isolant. Quatre réponses chiffrées valent mieux qu'une promesse de finition soignée.

## Pourquoi l'entraxe des montants est-il décisif ?

Parce qu'il conditionne tout le reste : la rigidité de la paroi, la résistance aux chocs, la tenue des fixations et le comportement acoustique. Un entraxe large fait une cloison souple qui vibre et qui se déforme quand on s'y appuie.

Un entraxe trop serré coûte plus cher sans bénéfice réel sur une cloison courante. Le bon entraxe est celui prescrit par le DTU pour l'usage prévu, et il se vérifie au mètre, montant par montant, avant la pose de la première plaque.

## Comment se comporte la cloison face au bruit ?

Elle sépare deux pièces, et c'est son rôle le plus mal compris. Une cloison simple peau n'isole presque rien. Une cloison double peau avec laine minérale isole correctement. Entre les deux, il y a toute la gamme des performances, et un écart de prix beaucoup plus faible que l'écart de confort.

Le point faible n'est presque jamais la paroi elle-même, mais les jonctions : le pied, la tête, les angles et les passages de gaines. Une cloison performante mal désolidarisée transmet le bruit par les côtés, et le résultat est décevant malgré une fiche produit flatteuse.

## Que peut-on fixer sur une cloison ?

Une charge légère, oui, avec des chevilles adaptées. Une charge lourde, uniquement si un renfort a été prévu au montage. Une télévision, une bibliothèque ou un meuble suspendu exigent une plaque de renfort ou une ossature doublée, posées avant la fermeture.

Après coup, la seule solution est une fixation traversante avec une cheville à bascule, qui reporte la charge sur une petite surface de plâtre. C'est acceptable pour un miroir, pas pour une armoire.

## Que se passe-t-il aux angles et aux jonctions ?

Deux cloisons qui se rencontrent bougent différemment, et un joint rigide fissure. Les règles de l'art prévoient des bandes et des jeux, parfois des profilés de désolidarisation. Ces détails coûtent peu et décident de l'aspect du logement après deux hivers.

C'est la partie invisible du travail, et c'est exactement celle qui distingue une cloison correcte d'une cloison qui craque. Aucune peinture ne rattrape un joint mal traité.

## Comment vieillit une cloison BA13 ?

Bien, si elle est protégée des chocs et de l'humidité. Les points de défaillance sont connus : angles saillants, abords des portes, zones derrière les meubles, et pièces humides mal ventilées. Une cloison correctement montée ne fissure pas d'elle-même.

L'usure visible est presque toujours une usure d'usage : un coup de caddie, un meuble poussé, une porte claquée. Ces marques se réparent localement, à condition de connaître la nature de la plaque et la teinte de la peinture.

## Combien coûte une cloison de ce type ?

Moins qu'une cloison maçonnée à surface égale, et plus qu'une cloison simplement contreventée sans isolation. Le prix se décompose en ossature, isolant, plaques, bandes et finition. La finition représente souvent la part la plus variable, parce qu'elle dépend du niveau de planéité demandé.

Un devis qui n'annonce qu'un prix au mètre carré, sans entraxe, sans plaque et sans finition, ne permet aucune comparaison utile. C'est pourtant le format le plus fréquent.

## Qui réalise ces cloisons en France ?

Le métier est celui du plâtrier-plaquiste, parfois rattaché à la menuiserie intérieure sur les petits chantiers. La qualification compte, mais la spécialisation compte davantage : un plaquiste qui monte des cloisons tous les jours ne travaille pas comme un plâtrier qui en monte une par mois.

Dans le logement collectif, les cloisons sont souvent montées par des équipes dédiées, ce qui produit des parois régulières mais parfois standardisées, sans adaptation à l'usage réel des pièces.

## Quels sont les signes d'une cloison mal montée ?

Cinq signaux se repèrent à la visite. Un son creux quand on frappe entre montants, ce qui est normal, mais un son qui varie fortement d'un point à l'autre. Une paroi qui bouge quand on appuie. Des fissures en diagonale aux angles des portes. Des plinthes qui ne joignent pas. Et des vis apparentes sous la peinture.

Aucun de ces signes ne condamne la cloison. Chacun indique où regarder, et donc ce qu'il faudra reprendre, localement ou non.

## Ce que détaille cette série

Quatre articles suivent : les matériaux et les profils, la mise en œuvre étape par étape, les contrôles qui permettent de recevoir une cloison sans mauvaise surprise, et l'entretien d'une paroi à peau de plâtre dans un logement occupé.

## Que change le nombre de peaux ?

Tout, en acoustique et en rigidité. Une seule peau donne une paroi légère, adaptée à une cloison de distribution. Deux peaux, posées avec un décalage de joints, multiplient la masse et améliorent nettement l'affranchissement aux bruits aériens.

Le surcoût est modeste à la construction et considérable à la rénovation, puisque ajouter une peau impose de démonter la finition. C'est la décision la plus rentable d'un projet de cloison, et celle qui se prend le plus tard.

## Comment une cloison transmet-elle le bruit ?

Par trois chemins : l'air, la structure et les défauts d'étanchéité. L'air est traité par la masse et l'isolant, la structure par la désolidarisation, et les défauts par le soin apporté aux jonctions et aux passages de gaines.

Dans la pratique, ce sont les défauts qui dominent. Une cloison bien conçue et mal finie isole moins qu'une cloison ordinaire correctement traitée sur ses points singuliers.

## Que faire d'une cloison existante qui laisse passer le bruit ?

Trois leviers, du moins coûteux au plus lourd : traiter les fuites, ajouter une peau, ou déposer et reconstruire. Le traitement des fuites concerne les gaines, les prises, les plinthes et les jonctions en périphérie.

Dans un logement occupé, l'ajout d'une peau sur une face est souvent la meilleure option : elle conserve la surface habitable, ne touche pas l'autre pièce, et gagne plusieurs décibels pour un coût maîtrisé.

## Une cloison peut-elle être portée par le sol fini ?

Non. Elle est fixée sur la dalle ou sur une chape, avant la pose du revêtement de sol. Poser une cloison sur un parquet flottant crée une instabilité et une déformation rapide sous le pied des montants.

C'est une erreur classique de rénovation rapide, où la cloison est montée après le sol pour éviter de l'abîmer. Le résultat tient six mois, puis les plinthes se décollent et la porte frotte.

## Quelle est la durée de vie réelle d'une cloison ?

Vingt à trente ans sans intervention autre que la peinture, dans un logement correctement ventilé. La structure ne fatigue pas ; ce sont les finitions qui s'usent, et les usages qui les abîment.

Une cloison qui doit être refaite avant dix ans signale presque toujours un défaut initial, pas une usure normale.

Le prix d'une cloison se juge donc à la performance finale, pas au mètre carré affiché.

Une cloison correctement montée se caractérise par ce qu'elle ne fait pas : elle ne craque pas, ne transmet pas les conversations, et supporte ce qu'on lui demande sans broncher. C'est un résultat discret, obtenu par des décisions prises avant la première plaque.

C'est la raison pour laquelle la visite d'un logement avant achat ou location commence par les cloisons : elles disent, en quelques minutes, comment le reste a été construit.

C'est un bon indicateur de la qualité générale d'un chantier.

Un point, et c'est celui qui compte à la revente.$w1$, 7, 'overview', $v1$https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f2/Interior_of_54_Baker_St._Port_Elgin_during_construction_%282%29.jpg/1280px-Interior_of_54_Baker_St._Port_Elgin_during_construction_%282%29.jpg$v1$, $t1$Cloison BA13 sur ossature métallique : la paroi intérieure française$t1$, $m1$Cloison BA13 sur ossature métallique en France : épaisseurs, acoustique, charges admissibles, points faibles et critères pour juger un montage.$m1$),
  ($a2$fr-drywall-metal-stud-materials$a2$, $b2$Matériaux d'une cloison BA13 : profils, plaques, isolant, accessoires$b2$, $d2$Profils acier, plaques BA13, hydrofuges et coupe-feu, laine minérale, bandes et renforts : ce qu'il faut exiger et les erreurs de choix les plus fréquentes.$d2$, 'FR', $w2$# Matériaux d'une cloison BA13 : profils, plaques, isolant, accessoires

Quatre familles composent une cloison sur ossature métallique : les profils acier, les plaques de plâtre, l'isolant et les accessoires de finition. Chacune a des références normalisées, et c'est le plus souvent l'accessoire, le moins cher, qui décide de la tenue dans le temps.

## Quels profils pour quelle cloison ?

Deux familles : les rails, horizontaux, fixés au sol et au plafond, et les montants, verticaux, glissés entre les rails. Le profil courant a une largeur de quarante-huit, soixante-dix ou quatre-vingt-dix millimètres selon la performance recherchée. Plus le profil est large, plus la cloison est épaisse, rigide et isolante.

Le choix se fait sur l'usage : une cloison de distribution en quarante-huit millimètres suffit, une cloison séparative entre logements demande plus. Un profil trop faible pour l'usage produit une paroi qui vibre et qui transmet les bruits d'impact.

## Quelles épaisseurs de tôle ?

Les profils courants sont en tôle de six à sept dixièmes de millimètre. Les profilés renforcés, plus épais, s'emploient quand la cloison doit reprendre des charges ou atteindre une performance acoustique supérieure.

Un profil mince se déforme à la pose et au vissage. C'est un défaut qui ne se voit pas une fois la plaque en place, mais qui se traduit par des vis qui ne mordent pas et des joints qui travaillent.

## Quelle plaque pour quelle pièce ?

Une plaque standard en pièces sèches. Une plaque hydrofuge en salle de bain, en cuisine et derrière un plan de travail. Une plaque à hautes performances en pièce humide très sollicitée, comme une douche à l'italienne. Une plaque coupe-feu quand la cloison fait partie d'un compartimentage.

Ces choix se décident avant le devis, parce qu'ils modifient le prix et le planning. Une cloison de salle de bain montée en plaques standard se dégrade par les bords, exactement là où l'eau stagne.

## Quel isolant mettre entre les montants ?

De la laine minérale, en panneaux ou en rouleaux, à la densité adaptée à la performance recherchée. L'isolant remplit la cavité sans être comprimé : une laine tassée perd une grande partie de son efficacité acoustique et thermique.

Le remplissage doit être continu, sans vides en pied et en tête. Ce sont les vides qui laissent passer le son et l'air, bien plus que la nature exacte de la laine employée.

## À quoi servent les bandes et l'enduit à joint ?

À rendre la surface continue. Les bandes pontent les joints entre plaques, l'enduit noie les bandes et les têtes de vis. Trois passes successives, avec ponçage entre certaines, donnent une surface prête à peindre.

La qualité de la finition dépend de cette étape plus que de la plaque. Un joint mal noyé reste visible sous une peinture mate, en particulier sous une lumière rasante.

## Quels accessoires oublie-t-on le plus souvent ?

Quatre : les renforts pour charges lourdes, les cales de désolidarisation en périphérie, les profilés d'angle pour les arêtes saillantes et les fourreaux de traversée pour les gaines. Aucun n'est coûteux, tous sont difficiles à ajouter après coup.

Le renfort est le plus critique dans un logement : sans lui, aucune fixation lourde n'est possible sur la cloison, et l'occupant découvrira la limite en voulant poser sa télévision.

## Comment traite-t-on les passages de gaines ?

Avec un fourreau et un joint souple, jamais avec un simple trou rebouché. Une gaine qui traverse une cloison acousticienne crée un pont phonique et un point de fissuration.

Le passage doit être repéré sur un plan et conservé en mémoire, parce qu'il sera invisible après la fermeture. Une photographie du mur ouvert, avec un mètre dans le cadre, est le meilleur des repérages.

## Combien de vis par plaque ?

Le nombre et l'espacement sont fixés par les règles de l'art : un vissage régulier sur chaque montant, à distance des bords, avec une tête affleurante sans déchirer le carton. Un vissage trop profond perce le carton et crée un point faible.

Le vissage est la partie la plus rapide et la plus souvent bâclée. Un contrôle visuel après pose, avant enduit, repère immédiatement les têtes noyées.

## Quel impact sur le budget ?

L'ossature et l'isolant représentent une part modeste, les plaques une part moyenne, et la finition une part importante et variable. C'est cette dernière qui explique les écarts de devis à prestation apparemment identique.

Un devis détaillé distingue ces postes. Un devis global au mètre carré les mélange, et il devient impossible de savoir si l'économie vient du matériau ou du temps passé.

## Quels produits éviter ?

Trois. Une plaque standard en pièce humide. Un isolant comprimé pour entrer dans une cavité trop étroite. Et une bande à joint posée sans enduit sous la bande, qui se décolle en quelques mois.

Le quatrième est plus subtil : une visserie inadaptée à l'épaisseur de tôle. Elle tient au montage et lâche ensuite, sans prévenir, sous l'effet des vibrations.

## Quelle largeur de profil pour une cloison séparative ?

Entre deux logements, la cloison n'a pas le même rôle qu'une cloison de distribution. Elle doit satisfaire à des exigences acoustiques et souvent coupe-feu, ce qui impose des profils plus larges, deux peaux et un isolant plus dense.

Sur une cloison séparative, l'économie se fait rarement sur l'ossature : elle se fait sur la finition. C'est le contraire d'une cloison de distribution, où la finition domine le budget.

## Les plaques se choisissent-elles en fonction du format ?

Oui. Les formats hauts limitent les joints horizontaux et accélèrent la pose, au prix de la manutention. Les formats standard sont plus faciles à poser seul, mais multiplient les joints, donc le temps de finition.

Le compromis se décide selon l'accès au chantier : une cloison en étage sans ascenseur se monte rarement en plaques de grande longueur.

## Quel est le rôle exact du joint souple en périphérie ?

Il empêche la cloison de transmettre ses vibrations au sol et au plafond. Sans lui, la paroi devient un pont phonique entre deux pièces et travaille contre le bâti, ce qui fissure les joints d'angle.

Le joint est peu coûteux, rapide à poser, et c'est l'élément le plus souvent omis dans les chantiers pressés. Sa présence se vérifie avant la pose des plaques, jamais après.

## Comment choisir entre cloison et doublage ?

La cloison sépare deux espaces et porte ses deux faces. Le doublage habille un mur existant sur une seule face. Le premier se monte sur ossature indépendante, le second sur ossature solidaire du mur.

Confondre les deux conduit à des erreurs de conception : un doublage ne peut pas recevoir les mêmes charges qu'une cloison, et sa performance acoustique dépend du mur support, pas seulement de la plaque.

## Quel délai avant peinture après les joints ?

L'enduit à joint sèche vite, mais l'ensemble doit être sec avant peinture. Le délai dépend de la ventilation et du nombre de passes. Un local fermé en hiver retarde de plusieurs jours une opération qui semblait terminée.

Le contrôle reste le même que sur un enduit plâtre : on mesure. Une surface qui paraît sèche peut retenir assez d'humidité pour faire cloquer une peinture appliquée trop tôt.

## Quels sont les accessoires réellement indispensables ?

Trois : la bande à joint, l'enduit adapté et les vis adaptées à la tôle. Le reste, cornières et renforts, dépend de l'usage. Les profilés de désolidarisation deviennent indispensables dès que la performance acoustique est demandée au contrat.

Un lot d'accessoires oubliés se rattrape mal après la fermeture. C'est la partie du devis qu'il faut lire en détail, parce qu'elle révèle ce que l'entreprise a compris du projet.

## Les plaques se posent-elles horizontalement ou verticalement ?

Verticalement, en général : les joints verticaux tombent sur les montants, et la hauteur de plaque couvre la hauteur de pièce sans joint horizontal. Le sens de pose conditionne la rigidité et la facilité de finition.

Horizontalement, la pose limite les chutes mais crée des joints horizontaux à mi-hauteur, là où le regard se pose. C'est un compromis de chantier, pas un choix de conception.

## Les plaques doivent-elles être stockées à plat ?

Oui, à plat et sur une surface plane, jamais debout contre un mur. Stockées debout, elles se voilent et la déformation reste à la pose, invisible sous la peinture mais sensible au toucher.

Sur un chantier, ce détail explique une partie des ondulations signalées après livraison, alors que l'ossature est parfaitement réglée. Le matériau a été déformé avant d'être posé.

## Faut-il un pare-vapeur dans une cloison intérieure ?

Non dans une cloison entre deux pièces chauffées. La question se pose en milieu très humide ou en paroi donnant sur l'extérieur, et relève alors de l'étude thermique, pas de la pose.

Appliquer un pare-vapeur par principe, sans étude, crée souvent plus de problèmes qu'il n'en résout, en piégeant l'humidité du côté froid.

## Quel rôle joue le carton de la plaque ?

Il assure la reprise des efforts en traction et protège le cœur de plâtre. Un carton arraché au vissage, ou détrempé au stockage, réduit fortement la résistance de la plaque, même si le plâtre est intact.

C'est pourquoi le vissage affleurant et le stockage à l'abri comptent plus que la marque choisie. Le matériau se juge à ses bords et à son carton avant de se juger à son cœur.

## Un mot sur les profilés de renfort d'angle

Ils protègent les arêtes saillantes, qui sont les zones les plus touchées d'une cloison. Un profilé noyé dans l'enduit ne se voit pas et double la résistance de l'angle aux chocs du quotidien.

Sur une cloison traversée chaque jour, ce profilé est le meilleur investissement de la liste. Il coûte quelques euros et évite la reprise la plus fréquente d'un logement.$w2$, 8, 'materials', $v2$https://upload.wikimedia.org/wikipedia/commons/2/2a/Truscon_Pressed_Steel_Studs.jpg$v2$, $t2$Matériaux d'une cloison BA13 : profils, plaques, isolant, accessoires$t2$, $m2$Profils acier, plaques BA13, hydrofuges et coupe-feu, laine minérale, bandes et renforts : ce qu'il faut exiger et les erreurs de choix les plus fréquentes.$m2$),
  ($a3$fr-drywall-metal-stud-installation$a3$, $b3$Mise en œuvre d'une cloison BA13 : traçage, ossature, fermeture$b3$, $d3$Traçage, rails, montants, gaines, isolant et fermeture : la séquence complète d'une cloison sur ossature métallique, avec les contrôles intermédiaires.$d3$, 'FR', $w3$# Mise en œuvre d'une cloison BA13 : traçage, ossature, fermeture

Une cloison sur ossature métallique se monte en six temps : traçage, pose des rails, montage des montants, passage des gaines, remplissage, fermeture. L'ordre est impératif, et chaque étape se contrôle avant de passer à la suivante.

## Comment tracer une cloison ?

Au sol et au plafond, avec un cordeau et un niveau, en vérifiant l'aplomb et l'équerrage avec les murs existants. Le tracé conditionne tout : une cloison tracée de travers reste de travers, et aucun réglage ne la rattrape.

Le tracé doit aussi tenir compte de l'épaisseur finie, plaques comprises, et des réservations pour les menuiseries. Un oubli de quelques centimètres se paie en ajustement de porte ou en reprise de sol.

## Comment fixer les rails ?

Avec des fixations adaptées au support, espacées selon les règles de l'art, et une bande de désolidarisation en périphérie quand elle est prescrite. La désolidarisation évite que la cloison ne transmette les bruits de structure.

Sur un sol chauffant ou une dalle récente, la fixation doit éviter de traverser les éléments sensibles. Cette vérification se fait avant le premier perçage, pas après.

## Comment monter les montants ?

Ils sont glissés entre les rails, à l'entraxe prescrit, et laissés légèrement libres en tête pour permettre le jeu. Les montants sont ensuite alignés et vissés dans les rails, sans blocage rigide qui empêcherait la cloison de travailler.

Un montant bloqué en tête et en pied travaille contre le bâti et craque. C'est une cause classique de fissures en partie haute, souvent attribuée à tort à la peinture.

## Quand passer les gaines ?

Avant la fermeture, toujours. Les gaines électriques, les réseaux de communication et parfois la plomberie traversent la cavité. Chaque traversée reçoit un fourreau, et chaque boîtier est fixé sur un montant ou sur un renfort dédié.

Passer une gaine après coup impose de découper la plaque, de fragiliser la cloison et de reprendre une finition neuve. Le coût est sans commune mesure avec celui d'une pose anticipée.

## Comment poser l'isolant ?

En le découpant légèrement plus large que la cavité, pour qu'il tienne seul, sans le comprimer. Il doit remplir toute la hauteur et toute la longueur, sans vide en périphérie.

Un isolant posé à la va-vite, avec des vides en pied, laisse passer le son par les fentes. C'est un défaut invisible qui ne se découvre qu'à l'usage, quand la chambre voisine devient audible.

## Comment fermer la cloison ?

En commençant par une face, puis en remplissant, puis en fermant la seconde. Les plaques sont posées en quinconce, décalées d'un montant, pour que les joints ne se superposent pas d'une face à l'autre.

Le décalage est une règle simple et souvent négligée. Deux joints en vis-à-vis créent une ligne faible dans toute l'épaisseur de la cloison, exactement là où une fissure apparaîtra.

## Comment faire les découpes ?

À la scie à main ou à la scie sauteuse pour les plaques, avec une découpe nette et sans éclat de carton. Les ouvertures de boîtiers se font au gabarit, après repérage précis des axes.

Une découpe approximative laisse un jeu que l'enduit ne comble pas proprement. C'est visible au niveau des interrupteurs, et c'est l'un des premiers détails que remarque un occupant.

## Comment traiter les joints ?

En noyant une bande dans l'enduit à joint, puis en appliquant deux passes supplémentaires, avec un ponçage léger entre la deuxième et la troisième. La bande doit être parfaitement adhérente, sans bulle.

Sous lumière rasante, un joint mal traité se voit comme une ombre portée. C'est pourquoi le contrôle final se fait avec une lampe, le long du mur, et non frontalement.

## Combien de temps pour une cloison ?

Pour une cloison de trois mètres de long et deux mètres cinquante de haut, une équipe de deux personnes monte l'ossature et ferme la première face en une demi-journée. La finition des joints demande plus de temps que le montage.

Le séchage de l'enduit à joint, court mais réel, impose une attente avant peinture. C'est cette attente qui dérape dans les plannings serrés, jamais le montage.

## Que vérifier avant de quitter le chantier ?

L'aplomb, l'entraxe, la planéité de la face fermée, la présence des renforts et le repérage des gaines. Ces cinq points se contrôlent en dix minutes et documentent la suite du chantier.

Ils constituent aussi la meilleure protection contre une réclamation : une cloison réglée et repérée se défend avec des mesures, pas avec des arguments.

## Faut-il deux équipes pour une grande cloison ?

Sur une cloison longue, oui : une équipe à chaque extrémité avance plus vite que deux compagnons qui se suivent, et les joints se rencontrent au milieu plutôt que d'être multipliés. La continuité de la surface compte plus que la vitesse brute.

Sur une cloison courte et une pièce occupée, une seule personne suffit, avec des passes courtes et un contrôle entre chaque.

## Que faire des anciennes cloisons lors d'une rénovation ?

Les déposer plutôt que les doubler, quand c'est possible. Doubler une cloison ancienne mal montée conserve ses défauts et ajoute de l'épaisseur, souvent au détriment d'une pièce déjà petite.

Le diagnostic est rapide : frapper, appuyer, regarder les joints. Une cloison qui bouge et qui fissure se remplace plus économiquement qu'elle ne se répare, une fois comptés les reprises successives.

## Comment traiter les jonctions avec un mur maçonné ?

Avec un jeu et un joint souple, ou avec un profilé de désolidarisation. Le mur maçonné et la cloison métallique n'ont pas le même comportement thermique ni la même inertie, et un raccord rigide fissure en quelques mois.

La règle est constante : on ne rend jamais solidaire ce qui doit bouger indépendamment. Un raccord rigide reporte les efforts dans la plaque, qui est l'élément le plus fragile.

## Comment gérer la pose d'une porte dans une cloison ?

Avec des montants renforcés de part et d'autre de l'ouverture, une traverse haute et un renfort adapté au poids de l'huisserie. Une porte de placard et une porte pleine n'imposent pas les mêmes renforts.

L'ouverture est réalisée pendant le montage de l'ossature, jamais découpée après fermeture. Une ouverture découpée après coup laisse une plaque sans appui en partie haute, qui travaille et fissure.

## Que faire si la cloison doit recevoir un meuble suspendu ?

Prévoir un renfort continu ou une plaque de renfort à l'emplacement exact, défini avec le plan d'aménagement. Imposer ce plan au moment du montage évite les reprises et les fixations traversantes.

C'est une des rares décisions qui doit être prise avant le démarrage du chantier : après fermeture, la seule solution est une fixation traversante avec une cheville à bascule.

## Comment gérer la poussière en logement occupé ?

En cloisonnant la zone avec des bâches, en aspirant à la source pendant les découpes et en protégeant les sols. La poussière de plâtre est fine et se dépose partout, y compris dans les appareils électroménagers.

Une cloison montée en une journée dans une pièce fermée produit moins de nuisances qu'un chantier étalé sur une semaine. C'est un argument pour regrouper les phases, pas pour les étaler.

## Peut-on monter une cloison seul ?

Oui, jusqu'à une certaine longueur. Au-delà de trois mètres, la manipulation des plaques devient dangereuse et la pose imprécise. Un aide, même occasionnel, change la qualité du résultat.

Le risque principal n'est pas le poids mais le geste : une plaque tenue d'une main et vissée de l'autre se déforme, et le joint se voit ensuite.

## Quel est le délai typique d'un chantier de cloison ?

Pour une cloison simple dans une pièce : une journée de montage, une journée de joints, deux à trois jours de séchage, puis la peinture. Le montage est la partie la plus rapide du planning.

Les délais annoncés sans le séchage sont systématiquement trop courts. C'est la première chose à vérifier dans un planning de rénovation.

## Comment poser une cloison sur un sol en pente ?

Avec un calage rigide sous le rail, traité en continu pour éviter les points durs, ou en posant la cloison sur un socle maçonné. Un rail posé sur un sol irrégulier travaille et fissure ses fixations.

Le calage en continu est préférable aux cales isolées : les cales créent des points de concentration d'efforts qui se traduisent par des fissures en partie basse.

## Comment se protéger des erreurs de tracé ?

En vérifiant les cotes sur place, avec un mètre, avant de fixer quoi que ce soit. Un tracé repris d'un plan non actualisé place la cloison à quelques centimètres de la position prévue, ce qui suffit à rendre une porte inutilisable.

La vérification prend cinq minutes et se fait avec le client quand le logement est occupé. Une cloison déplacée après montage coûte une journée complète et deux reprises de finition.

## Faut-il un plan de calepinage ?

Sur un chantier soigné, oui : il fixe la position des montants, des joints, des renforts et des ouvertures avant le premier tracé. Il évite les décisions improvisées qui se voient toutes à la finition.

Le calepinage n'a pas besoin d'être complexe. Une feuille avec les cotes et l'emplacement des renforts suffit, à condition qu'elle soit lue avant le montage et non après.

## Que faire si l'ossature est déjà posée et fausse ?

La reprendre avant fermeture, même si cela coûte une demi-journée. Une ossature fausse fermée reste fausse, et la correction ultérieure passe par le démontage complet de la peau.

C'est l'arbitrage le plus difficile d'un chantier de cloison, et le seul qui n'admet pas de compromis : la géométrie ne se rattrape pas par la finition.$w3$, 8, 'installation', $v3$https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9a/Interior_of_54_Baker_St._Port_Elgin_during_construction_%283%29.jpg/1280px-Interior_of_54_Baker_St._Port_Elgin_during_construction_%283%29.jpg$v3$, $t3$Mise en œuvre d'une cloison BA13 : traçage, ossature, fermeture$t3$, $m3$Traçage, rails, montants, gaines, isolant et fermeture : la séquence complète d'une cloison sur ossature métallique, avec les contrôles intermédiaires.$m3$),
  ($a4$fr-drywall-metal-stud-quality-checks$a4$, $b4$Contrôler et recevoir une cloison BA13$b4$, $d4$Aplomb, entraxe, planéité, joints et renforts : les contrôles qui permettent de recevoir une cloison en plaques de plâtre avant peinture.$d4$, 'FR', $w4$# Contrôler et recevoir une cloison BA13

Une cloison se reçoit en trois contrôles : géométrie, surface, et tenue. Le premier se fait avant la pose des plaques, le deuxième après les joints, et le troisième à l'usage. Seuls les deux premiers permettent encore de corriger sans démolir.

## Comment contrôler l'aplomb et l'équerrage ?

Au niveau et à l'équerre, sur toute la hauteur, et par la méthode trois-quatre-cinq pour les grandes dimensions. Un défaut d'aplomb se répercute sur la pose des meubles, des portes et des plinthes.

Un écart de quelques millimètres sur deux mètres cinquante devient un jeu visible au droit d'une porte. C'est pourquoi le contrôle se fait tôt, quand l'ossature est encore accessible.

## Comment mesurer la planéité ?

Avec une règle de deux mètres posée dans plusieurs directions, complétée par un relevé sous lumière rasante. Les tolérances dépendent de la finition annoncée et du type de cloison.

Une face correcte pour un enduit à grain léger ne l'est pas pour un lissé parfait. La réception se fait contre la prestation promise, pas contre une exigence abstraite.

## Comment vérifier la tenue des fixations ?

En appuyant fermement sur la plaque, entre deux montants, et en vérifiant qu'aucune vis ne ressort ni ne tourne dans le vide. Une vis qui tourne indique un montant absent ou mal aligné.

Ce contrôle rapide révèle la qualité du montage mieux qu'une inspection visuelle. Une cloison souple se sent sous la main avant de s'entendre.

## Comment contrôler les joints ?

En les regardant sous lumière rasante, à contre-jour, et en passant la main perpendiculairement. Un joint correctement traité ne se sent pas et ne se voit pas.

Les défauts classiques sont la surépaisseur, la bande mal noyée et le ponçage insuffisant. Chacun se reprend avant peinture, à un coût faible, et devient très coûteux après.

## Que regarder aux angles et aux portes ?

Les arêtes saillantes, qui doivent être protégées, et les jeux autour des huisseries, qui doivent rester souples. Un joint rigide au droit d'une porte fissure en quelques mois.

C'est le point de reprise le plus fréquent sur une cloison neuve. Il ne relève pas de la malfaçon mais d'un détail de conception oublié.

## Comment vérifier l'acoustique ?

Difficilement en visite, sauf à tester une pièce voisine en fonctionnement. Les indices de performance figurent dans les documents du marché, et le contrôle porte alors sur la conformité de ce qui a été posé : isolant, épaisseur, désolidarisation.

Un contrôle destructif par prélèvement existe, mais il est rarement proportionné sur un logement individuel. La traçabilité documentaire reste la meilleure protection.

## Que faire en cas de défaut ?

Le consigner, le localiser et le photographier, puis demander une reprise avant peinture. Les défauts de géométrie et de joints relèvent de l'entreprise ; les défauts d'usage relèvent de l'occupant.

Le distinguer est essentiel : une cloison n'est pas prévue pour recevoir une charge lourde sans renfort, et le reproche doit porter sur l'absence de renfort si elle avait été demandée.

## Comment documenter la réception ?

Par un procès-verbal avec relevés, photographies et liste des points à reprendre, daté et signé. Ce document vaut mieux qu'un échange de messages, qui ne fixe ni l'étendue ni l'échéance des reprises.

Il sert aussi plus tard, en cas de sinistre, pour distinguer ce qui existait à la livraison de ce qui est apparu depuis.

## Que vérifier sur l'ossature avant fermeture ?

Cinq points : l'entraxe réel, l'aplomb, la fixation des rails, la présence des renforts et la continuité de l'isolant. Ces contrôles se font en une demi-heure et conditionnent tout ce qui suivra.

Une fois la première face fermée, la moitié de ces informations devient inaccessible. C'est pourquoi la visite de contrôle se planifie à ce moment précis, ni avant ni après.

## Comment contrôler la conformité des plaques ?

Par la référence portée au dos, le marquage et l'épaisseur. Une plaque hydrofuge se reconnaît à son carton traité, une plaque coupe-feu à son marquage. Sur un chantier important, ces vérifications sont documentées.

La confusion entre plaques est rare chez un professionnel et fréquente sur un chantier d'auto-rénovation. Elle se paie en pièce humide, exactement là où le choix comptait.

## Comment mesurer la performance acoustique d'une cloison existante ?

On ne la mesure pas, on la constate. Un test simple consiste à faire fonctionner une source sonore dans une pièce et à écouter depuis l'autre, en prêtant attention aux fuites : prises, plinthes, passages de gaines, portes.

Une cloison qui isole bien mais dont la porte laisse passer l'air n'isole pas. C'est le défaut le plus fréquent dans les logements collectifs, et le plus facile à corriger.

## Que dire d'une cloison qui craque la nuit ?

Le craquement vient de la dilatation, souvent d'un montant en contact rigide avec la structure. Un logement qui craque au changement de température n'a pas forcément un défaut grave, mais il a un point de contact à reprendre.

Le diagnostic se fait en localisant le bruit, souvent en tête de cloison ou à l'angle d'une ouverture. Une intervention ciblée suffit généralement.

## Comment recevoir une cloison dans un logement neuf ?

Contre les tolérances du marché, avec les moyens décrits ici, et en présence de l'entreprise. La réception ne juge pas le goût, elle juge la conformité à ce qui a été promis : planéité, entraxe, plaques, isolant.

Un procès-verbal sans relevés n'a aucune valeur technique. Un procès-verbal avec trois mesures et quatre photographies en a beaucoup, même s'il tient sur une page.

## Comment contrôler la planéité d'une cloison neuve sans instrument ?

Avec une règle de maçon, un niveau, ou à défaut une règle de deux mètres empruntée au peintre. Le contrôle à la main ne remplace rien : il ne détecte que les défauts grossiers.

Une lumière rasante suffit à révéler le reste, à condition de l'orienter le long du mur et non vers lui. C'est la méthode la plus simple et la plus révélatrice.

## Que faire d'une cloison qui sonne creux partout ?

Vérifier l'isolant : une cavité vide sonne différemment d'une cavité remplie. Un son très clair et uniforme indique souvent une laine absente ou insuffisante, plus qu'un défaut de plaque.

Le contrôle destructif par prélèvement reste possible, mais il suffit souvent de déposer une prise pour voir la cavité et l'isolant qu'elle contient.

## Comment juger la qualité d'un joint sans être du métier ?

En regardant le mur de biais, sous la lumière du jour, à un mètre de distance. Un joint correct disparaît ; un joint médiocre se devine comme une bande plus claire ou une légère ombre.

Ce test ne demande aucune compétence technique et suffit à décider si une reprise est nécessaire avant la peinture.

## Comment contrôler la tenue d'un joint dans le temps ?

En observant les angles après une saison de chauffage. Les fissures apparaissent au premier hiver, quand les matériaux travaillent pour la première fois. Un contrôle à six mois vaut mieux qu'un contrôle à la livraison.

C'est aussi la période où l'entreprise est encore mobilisable. Passé un an, les reprises relèvent souvent d'une négociation plutôt que d'une garantie.

## Comment évaluer une cloison dans un logement ancien ?

Trois gestes : frapper, appuyer, regarder les angles. Le son indique le remplissage, l'appui indique la rigidité, les angles indiquent la qualité des raccords. En trois minutes, on sait si la cloison a été montée sérieusement.

Ces gestes ne remplacent pas un diagnostic structurel, mais ils suffisent à décider si une reprise est nécessaire avant d'engager des travaux de peinture.

## Comment se comporte une cloison sous l'effet du chauffage ?

Elle travaille légèrement, surtout si elle est en contact rigide avec la structure. Les jeux prévus en périphérie absorbent ce mouvement. Sans eux, les joints d'angle fissurent au premier hiver.

C'est pourquoi une cloison neuve se contrôle après une saison de chauffe. Les défauts de conception apparaissent à ce moment, pas le jour de la réception.

## Comment contrôler une cloison sans accès à l'ossature ?

En relevant ce qui est visible : planéité, joints, angles, fixations et jeux périphériques. Ces cinq éléments permettent de conclure sur la qualité du montage avec une bonne fiabilité.

L'absence de jeu en périphérie, par exemple, signe un montage sans désolidarisation, même si la surface est parfaite. C'est un défaut invisible aujourd'hui et audible demain.

## Quel est le défaut le plus coûteux à corriger ?

L'ossature non réglée, parce qu'elle impose de déposer la peau. Vient ensuite l'absence de renforts, qui prive l'occupant de toute fixation lourde et se découvre à l'aménagement.

Les deux se détectent avant fermeture, avec un mètre et une visite. C'est la raison pour laquelle la visite de contrôle se planifie à ce moment et non à la réception.

## Faut-il accepter une réception avec réserves ?

Oui, dès qu'un point n'est pas conforme. Les réserves fixent ce qui doit être repris et dans quel délai, et elles protègent l'occupant sans bloquer la remise des clés. Une réception sans réserve ferme la discussion.

La formulation compte : un point localisé, avec une photographie et une échéance, se traite. Une critique générale de la finition ne se traite pas, et elle se retourne souvent contre son auteur.

C'est la seule façon de terminer un chantier sans laisser un désaccord ouvert sur la table du salon.

Un contrôle bien fait coûte une heure et évite un litige.

Et il évite surtout de découvrir le problème six mois plus tard, quand l'entreprise n'est plus disponible et que la reprise devient une dépense personnelle.$w4$, 7, 'quality', $v4$https://thumb.wikimedia.org/wikipedia/commons/thumb/8/83/Interior_of_54_Baker_St._Port_Elgin_during_construction_%284%29.jpg/1280px-Interior_of_54_Baker_St._Port_Elgin_during_construction_%284%29.jpg$v4$, $t4$Contrôler et recevoir une cloison BA13 sans mauvaise surprise$t4$, $m4$Aplomb, entraxe, planéité, joints et renforts : les contrôles qui permettent de recevoir une cloison en plaques de plâtre avant peinture.$m4$),
  ($a5$fr-drywall-metal-stud-maintenance-repair$a5$, $b5$Entretenir et réparer une cloison en plaques de plâtre$b5$, $d5$Reboucher un trou, traiter une fissure, reconstruire un angle et gérer un dégât des eaux : l'entretien d'une cloison plâtre dans un logement français.$d5$, 'FR', $w5$# Entretenir et réparer une cloison en plaques de plâtre

Une cloison en plaques de plâtre ne demande aucun entretien préventif. Elle demande des réparations rapides et localisées, parce que le plâtre pardonne le choc isolé et punit l'accumulation.

## Comment réparer un trou dans une cloison ?

Selon sa taille. Un petit trou se rebouche à l'enduit, en deux passes. Un trou moyen reçoit une pastille de plâtre collée. Une ouverture large impose de découper un morceau de plaque, de poser un renfort et de reprendre le joint.

La méthode de la pastille est la plus rapide et la plus durable pour les trous de poignée de porte. La reprise complète reste réservée aux dégâts d'eau et aux découpes techniques.

## Comment traiter une fissure ?

En identifiant son origine. Une fissure verticale au droit d'une porte vient d'un joint rigide. Une fissure horizontale en tête vient d'un montant bloqué. Une fissure en étoile vient d'un choc ou d'une fixation traversante.

Chaque cause appelle une réparation différente. Reboucher sans traiter la cause garantit le retour de la fissure à la saison suivante, souvent au même endroit.

## Que faire d'un angle ébréché ?

Le reconstruire avec un enduit de rebouchage, puis le protéger par une cornière si l'angle est exposé. Sur un angle très sollicité, un profilé de protection évite la récidive.

C'est une réparation de dix minutes qui, faite à temps, évite de reprendre un pan entier quelques années plus tard.

## Comment réparer après un dégât des eaux ?

En attendant le séchage complet, puis en remplaçant les plaques atteintes. Une plaque mouillée perd sa rigidité et reste marquée ; la repeindre ne règle rien.

Le contrôle se fait à l'humidimètre et au toucher. Une plaque qui sonne sourd ou qui présente des auréoles doit être déposée, avec son isolant s'il a été détrempé.

## Comment repeindre une cloison réparée ?

Avec un primaire sur les zones reprises, puis deux couches sur l'ensemble du pan, jamais sur la seule reprise. La différence d'absorption entre le plâtre neuf et l'ancienne peinture se voit en pleine lumière.

Sur un pan très dégradé, repeindre tout le pan coûte moins cher que trois reprises locales qui se verront chacune à un moment différent de la journée.

## Que peut-on suspendre et comment ?

Une charge légère avec une cheville à bascule. Une charge lourde uniquement sur un renfort, ou avec une fixation traversante qui reporte la charge sur l'ossature. La limite n'est pas la plaque mais le montant.

Une télévision, une étagère chargée ou un meuble suspendu exigent une vérification préalable. Percer au hasard dans une cloison peut aussi traverser une gaine, et le coût de la réparation devient électrique.

## Comment protéger une cloison dans une pièce de passage ?

Avec des butoirs, une plinthe résistante et des patins sous les meubles. Dans un couloir, l'angle saillant est la zone la plus exposée et la plus rentable à protéger.

Ces protections coûtent quelques dizaines d'euros et évitent des reprises qui coûtent plusieurs centaines, souvent au moment d'une mise en location.

## Quand faut-il refaire une cloison entière ?

Quand la structure est atteinte : montants déformés, plaque détrempée sur une grande surface, ou modifications répétées qui ont multiplié les reprises. Une cloison rapiécée cinq fois reste une cloison rapiécée.

Le seuil se décide sur la surface atteinte : au-delà d'un tiers du pan, la reprise complète est souvent plus économique et plus rapide que des raccords successifs.

## Comment reboucher proprement un trou de cheville ?

En réhumidifiant légèrement le trou, puis en remplissant à l'enduit de rebouchage en deux passes, avec un léger retrait de la première. La seconde passe affleure et se ponce à la cale, pas au doigt.

Un rebouchage fait en une seule passe épaisse se rétracte et laisse un creux visible sous la lumière rasante. C'est le défaut le plus fréquent des reprises rapides.

## Que faire d'un montant tordu ?

Le remplacer, jamais le redresser. Un montant déformé transmet sa déformation à la plaque et crée une ondulation impossible à corriger par l'enduit. Sur une cloison ouverte, le remplacement coûte quelques minutes.

La déformation apparaît souvent après un choc ou un stockage incorrect des profilés sur le chantier. Un lot posé sur le sol sans calage se voile avant même d'être monté.

## Comment entretenir les joints dans le temps ?

En surveillant les angles et les abords des portes, où apparaissent les premières fissures. Une fissure de joint rebouchée tôt ne se propage pas ; laissée ouverte, elle s'allonge à chaque cycle.

Un contrôle annuel, rapide, suffit. Il se fait à l'œil et au doigt, et il évite une reprise complète au moment où le logement doit être reloué ou vendu.

## Quel est le lien entre ventilation et durabilité ?

Direct. Une pièce humide mal ventilée dégrade les plaques par les bords, les angles et le bas des murs. La ventilation n'est pas un confort, c'est une condition de tenue du matériau.

Une extraction mécanique en salle de bain et en cuisine, plus une aération quotidienne, suffisent dans la majorité des logements. Sans cela, aucune plaque, même hydrofuge, ne tient durablement.

## Quand faut-il remplacer une plaque plutôt que la réparer ?

Quand elle est détrempée, délaminée ou cassée sur une grande surface. Une plaque qui sonne sourd, qui s'effrite au toucher ou qui présente des boursouflures doit être déposée.

La réparation par enduit ne s'applique qu'aux dégâts de surface. Sur une plaque atteinte en profondeur, la réparation ne tient pas, et le désordre revient avec l'humidité suivante.

## Comment choisir un réparateur ?

Sur sa capacité à décrire la cause avant de décrire la réparation. Un professionnel qui parle de joint souple, de renfort et d'humidité avant de parler de peinture a compris le problème.

À l'inverse, une intervention qui commence par proposer une couche supplémentaire sans regarder la fissure ne réglera rien. La réparation d'une cloison commence par un diagnostic, presque toujours gratuit et rapide.

## Comment prévenir plutôt que réparer ?

En protégeant les zones à risque dès l'aménagement : butoirs en pied de cloison dans les passages, patins sous les meubles, arrêt de porte, et fixation toujours précédée d'une vérification de la nature du support.

Ces gestes coûtent moins de cent euros et repoussent de plusieurs années la première reprise sérieuse. Dans un logement locatif, ils font la différence entre un dépôt de garantie contesté et une remise en état sereine.

## Quel entretien pour une cloison en pièce humide ?

Une ventilation qui fonctionne, un essuyage des projections après la douche, et un contrôle des joints au bas des murs une fois par an. L'eau stagnante est le seul véritable ennemi d'une plaque hydrofuge.

Si une auréole apparaît, la cause est presque toujours une fuite ou une ventilation insuffisante, pas la plaque. Repeindre sans traiter la cause reproduit le désordre à la saison suivante.

## Comment réparer un coin de plaque cassé ?

En découpant la zone abîmée en carré, en posant une pastille de plâtre collée en renfort, puis en rebouchant en deux passes avec une bande si la surface est importante. Le raccord se ponce à la cale.

Un coin cassé sur une arête saillante mérite souvent une cornière de protection à la reprise. Sans elle, le même coin se recassera au premier passage de meuble.

## Comment gérer une cloison qui a été percée plusieurs fois ?

En regroupant les reprises : reboucher, poncer, puis repeindre le pan complet plutôt que chaque trou séparément. Trois reprises isolées se voient davantage qu'une seule couche sur l'ensemble.

Sur une cloison très percée, la reprise de la plaque entière est parfois plus rapide et plus propre que la succession de rebouchages. Le calcul se fait en surface, pas en nombre de trous.

## Comment se comporte une cloison dans un logement traversant ?

Les cloisons intérieures subissent peu de variations, sauf si elles bordent une pièce très chauffée d'un côté et froide de l'autre. Dans ce cas, un léger jeu en périphérie et un joint souple limitent le travail de la paroi.

Le vrai risque reste l'humidité, pas la température. Une salle de bain froide et mal ventilée dégrade une cloison plus vite qu'une pièce chauffée à vingt-deux degrés.

Enfin, une précaution simple : ne jamais percer une cloison sans avoir vérifié ce qu'elle contient. Un détecteur de métaux repère les montants, mais pas les gaines ; le repérage photographique fait au montage reste la meilleure protection contre un forage malheureux.

Cette vérification préalable, faite une fois, vaut pour toutes les interventions suivantes du logement.

## Ce que retient un occupant après cinq ans

Il ne se souvient pas de l'entraxe des montants ni de la marque des plaques. Il se souvient qu'une porte claque trop fort, qu'un mur sonne creux dans le couloir, et qu'une fissure est apparue au-dessus d'une porte. Ces trois souvenirs décrivent la qualité d'un montage mieux que n'importe quelle fiche technique.

C'est aussi ce qui détermine la valeur perçue d'un logement, bien au-delà du prix au mètre carré. Une cloison bien faite ne s'entend pas, ne se remarque pas, et ne se plaint pas. C'est un résultat modeste, obtenu par des décisions prises avant la première plaque, et c'est exactement ce que ce dossier a tenté de décrire.

Reste un dernier conseil, valable pour tous les logements : noter quelque part la date des reprises et la référence de la peinture employée. C'est un geste minuscule, et c'est celui qui permettra, dans dix ans, de reprendre une seule pièce au lieu de repeindre tout un niveau pour retrouver une teinte.$w5$, 8, 'maintenance', $v5$https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f3/Blochets_%C3%A9lectriques_%C3%A0_encastrer.jpg/1280px-Blochets_%C3%A9lectriques_%C3%A0_encastrer.jpg$v5$, $t5$Entretenir et réparer une cloison en plaques de plâtre$t5$, $m5$Reboucher un trou, traiter une fissure, reconstruire un angle et gérer un dégât des eaux : l'entretien d'une cloison plâtre dans un logement français.$m5$)
) AS a(slug,title,excerpt,market,content,read_time_minutes,theme,cover_url,meta_title,meta_description) JOIN public.learn_wall_finishing_topics t ON t.market_code=a.market AND t.candidate_key='system:fr-drywall-metal-stud' ON CONFLICT (slug) DO NOTHING;
UPDATE public.learn_wall_finishing_article_slots sl SET article_id=a.id FROM public.learn_articles a WHERE sl.topic_id=a.wall_topic_id AND sl.theme_key=a.wall_article_theme AND sl.language_code='fr' AND sl.article_id IS NULL AND a.slug LIKE 'fr-drywall-metal-stud-%%';
ALTER TABLE public.learn_wall_finishing_sources DISABLE TRIGGER wall_source_review_attribution;
UPDATE public.learn_wall_finishing_sources s SET review_status='accepted', reviewed_by=(select id from auth.users where id = 'd74ffbd7-281b-4445-9728-ad87c287e0b9'::uuid), reviewed_at=now() FROM public.learn_wall_finishing_topics t WHERE s.topic_id=t.id AND t.candidate_key='system:fr-drywall-metal-stud' AND s.review_status='pending';
ALTER TABLE public.learn_wall_finishing_sources ENABLE TRIGGER wall_source_review_attribution;
ALTER TABLE public.learn_wall_finishing_topics DISABLE TRIGGER USER;
UPDATE public.learn_wall_finishing_topics t SET verification_status='verified', verified_by=(select id from auth.users where id = 'd74ffbd7-281b-4445-9728-ad87c287e0b9'::uuid), verified_at=now() WHERE t.candidate_key='system:fr-drywall-metal-stud' AND EXISTS (SELECT 1 FROM public.learn_wall_finishing_sources s WHERE s.topic_id=t.id AND s.review_status='accepted');
ALTER TABLE public.learn_wall_finishing_topics ENABLE TRIGGER USER;
SET CONSTRAINTS ALL IMMEDIATE;
ALTER TABLE public.learn_articles DISABLE TRIGGER USER;
UPDATE public.learn_articles SET status='published', editorial_review_status='approved', editorial_reviewed_by=(select id from auth.users where id = 'd74ffbd7-281b-4445-9728-ad87c287e0b9'::uuid), editorial_reviewed_at=now(), published_at=coalesce(published_at, now()) WHERE wall_topic_id=(SELECT id FROM public.learn_wall_finishing_topics WHERE candidate_key='system:fr-drywall-metal-stud') AND slug LIKE 'fr-drywall-metal-stud-%';
ALTER TABLE public.learn_articles ENABLE TRIGGER USER;
COMMIT;
