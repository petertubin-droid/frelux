BEGIN;
INSERT INTO public.learn_wall_finishing_sources(topic_id,title,publisher,url,claim_scope) SELECT t.id,v.title,v.publisher,v.url,v.claim_scope FROM public.learn_wall_finishing_topics t CROSS JOIN (VALUES ('DTU enduits intérieurs au plâtre','CSTB','https://www.cstb.fr/','Règles de l''art des enduits intérieurs au plâtre et tolérances'),('Mise en œuvre et finitions','FFB','https://www.ffbatiment.fr/','Pratiques professionnelles de plâtrerie et de finition'),('Travaux de plâtrerie','CAPEB','https://www.capeb.fr/','Métiers et bonnes pratiques des entreprises de plâtrerie'),('Normes NF DTU','AFNOR','https://www.boutique.afnor.org/','Référentiel normatif applicable aux ouvrages de plâtrerie')) AS v(title,publisher,url,claim_scope) WHERE t.candidate_key='system:fr-masonry-plaster' AND NOT EXISTS (SELECT 1 FROM public.learn_wall_finishing_sources s WHERE s.topic_id=t.id AND s.url=v.url);
INSERT INTO public.learn_articles(slug,title,excerpt,content,category_slug,wall_market_code,wall_topic_id,wall_article_theme,wall_language_code,status,author,read_time_minutes,cover_image_url,meta_title,meta_description) SELECT a.slug,a.title,a.excerpt,a.content,'surface-preparation',a.market,t.id,a.theme,'fr','draft','FRELUX Learn',a.read_time_minutes,a.cover_url,a.meta_title,a.meta_description FROM (VALUES
  ($a1$fr-masonry-plaster-overview$a1$, $b1$Bloc béton et enduit plâtre : la paroi intérieure française$b1$, $d1$Paroi intérieure française en blocs de béton ou briques avec enduit plâtre : support, adhérence, épaisseurs, séchage et causes réelles de désordre.$d1$, 'FR', $w1$# Bloc béton et enduit plâtre : la paroi intérieure française

En France, la paroi intérieure la plus courante n'est ni un mur porteur en béton banché ni une cloison en plaques : c'est un mur en blocs de béton ou en briques, recouvert d'un enduit au plâtre appliqué à la main. Deux couches, un dressage, un lissage, puis la peinture. Ce montage simple explique une grande partie de ce que l'on voit dans les logements français, et une grande partie de ce qui y vieillit mal.

Comprendre cet assemblage, c'est comprendre une chaîne : le support, l'accrochage, l'enduit, la finition, la peinture. Chaque maillon dépend du précédent, et c'est presque toujours le premier qui décide du résultat.

## Pourquoi enduire un mur intérieur plutôt que le peindre directement ?

Parce qu'un mur en blocs n'est jamais plan. Les blocs présentent des tolérances dimensionnelles, les joints de mortier créent des surépaisseurs, et le mur livré brut varie de plusieurs millimètres sur un mètre. Un enduit de plâtre corrige cette géométrie et donne une surface continue, dure et lisse, sur laquelle une peinture peut être appliquée dans de bonnes conditions.

Il apporte aussi une part de confort : le plâtre régule l'humidité de l'air intérieur, il participe à la résistance au feu de la paroi, et il améliore l'isolation acoustique entre deux pièces de quelques décibels, ce qui n'est pas neutre dans un logement collectif.

## Que disent les normes françaises ?

Les règles de l'art sont fixées par les DTU, et notamment les DTU relatifs aux enduits intérieurs au plâtre et aux ouvrages de plâtrerie. Ils définissent les supports acceptés, les épaisseurs, les délais de séchage avant peinture et les tolérances de planéité à réception.

Un devis qui ne cite ni le DTU applicable ni l'épaisseur d'enduit n'est pas vérifiable. La première question à poser à une entreprise n'est donc pas le prix au mètre carré, mais la référence normative sur laquelle elle s'engage.

## Quel support trouve-t-on derrière l'enduit ?

Trois cas dominent. Le bloc de béton creux, très répandu en maison individuelle. La brique, notamment la brique de terre cuite à alvéoles, fréquente en logement collectif. Et le béton banché, qui demande un traitement particulier car il est lisse et peu absorbant.

Chacun réagit différemment : le bloc creux absorbe, la brique alvéolaire bouge avec l'humidité, le béton banché n'accroche pas. La même formule d'enduit appliquée sans discernement sur ces trois supports donne trois résultats différents, dont deux décevants.

## Pourquoi l'accrochage est-il l'étape décisive ?

Parce qu'un enduit qui n'adhère pas se décolle en plaques, et que le défaut n'apparaît qu'après plusieurs mois. Sur un support lisse ou poussiéreux, l'accrochage exige un traitement : piquage, grenage, application d'un produit d'accrochage, ou projection d'une barbotine avant l'enduit.

Le test le plus simple reste le même qu'ailleurs : frotter le support avec la main. Si la poussière part, l'enduit partira aussi. Ce contrôle prend une minute et évite une reprise complète.

## Combien de couches, et quelle épaisseur ?

En pratique, deux passes : un dégrossi, qui rattrape la géométrie, puis une couche de finition plus fine, dressée à la règle et lissée. L'épaisseur totale se situe le plus souvent entre dix et vingt millimètres selon le support et la planéité initiale.

L'erreur classique consiste à vouloir tout rattraper en une seule passe épaisse. Une couche trop forte fissure au séchage, se détache du support par son propre poids et laisse une surface qui sonne creux sous les doigts.

## Combien de temps avant de peindre ?

Le plâtre doit être sec, et sec ne veut pas dire sec au toucher. Il faut compter plusieurs semaines pour une épaisseur courante, davantage en hiver ou dans un logement non chauffé. Un enduit humide recouvert de peinture bloque l'eau dans la paroi et fait cloquer le film.

La mesure est simple : un humidimètre à pointes, relevé en plusieurs endroits et comparé d'une semaine sur l'autre. C'est la seule façon sérieuse de décider, et elle coûte moins cher qu'une reprise.

## Quelles finitions trouve-t-on en France ?

Trois familles. L'enduit lissé, qui reçoit une peinture mate ou satinée et donne la surface la plus plane. L'enduit gratté ou taloché fin, qui conserve une légère texture. Et l'enduit projeté, plus rapide, qui convient aux grandes surfaces et aux circulations.

Le choix de la finition conditionne la peinture : un grain léger pardonne beaucoup à l'application, un lissé parfait ne pardonne rien. Il conditionne aussi le prix, parce que le lissage demande du temps de main-d'œuvre qualifiée.

## Que coûte ce type de paroi, et qui la réalise ?

Deux métiers interviennent : le maçon pour le mur, le plâtrier pour l'enduit. Sur un logement neuf, l'enduit intérieur représente une part modeste du budget et une part importante de la qualité perçue, car c'est la surface que l'on touche et que l'on regarde tous les jours.

Les prix se comparent à prestation décrite : support, épaisseur, finition, délai de séchage, traitement des angles et des tableaux. Sans cette description, deux devis ne parlent pas du même ouvrage.

## Qu'est-ce qui vieillit le plus vite ?

Trois choses. Les angles, qui s'ébrèchent au moindre choc. Les abords des menuiseries, où le plâtre fissure quand l'huisserie travaille. Et les pièces humides, où l'enduit se dégrade si la ventilation est insuffisante.

Aucune de ces trois n'est un défaut de produit. Ce sont des points singuliers, et un point singulier mal traité devient une reprise visible, alors qu'il coûtait presque rien à traiter correctement.

## Comment se lit un désordre sur un enduit ?

Un enduit qui sonne creux est décollé. Un enduit qui fissure en toile d'araignée a séché trop vite ou a été appliqué trop épais. Un enduit qui farine manque de liant ou a été surchargé en charge inerte. Un enduit qui s'effrite au bas d'un mur signale une remontée d'humidité.

Chaque symptôme renvoie à une cause précise, et donc à une réparation précise. Gratter et repeindre sans diagnostic ne fait que déplacer le problème d'une saison.

## Ce que couvre cette série

Quatre articles détaillent la suite : les matériaux et ce qu'il faut exiger, la mise en œuvre étape par étape, les contrôles qui permettent de refuser un ouvrage avant peinture, et l'entretien d'une paroi plâtrée dans un logement français.

## Pourquoi certaines parois sonnent-elles creux dès la livraison ?

Parce que l'enduit n'a pas adhéré, ou parce qu'il s'est décollé en séchant. Trois causes reviennent : un support poussiéreux ou lisse non traité, une première passe trop épaisse, et une application par temps trop chaud qui a fait sécher la surface avant le cœur.

Le contrôle au son, fait à la main sur toute la surface, prend quelques minutes par pièce. Il vaut mieux le faire avant la peinture, quand la reprise consiste à gratter une zone et à la refaire, qu'après, quand il faut décaper un film complet.

## Qu'appelle-t-on une paroi « finie » en France ?

Une paroi qui reçoit directement la décoration, sans doublage ni plaque rapportée. Le mur porteur ou la cloison maçonnée reçoit l'enduit, puis la peinture. C'est le montage traditionnel, et il reste majoritaire en maison individuelle comme en logement collectif ancien.

Sa concurrente est la plaque de plâtre sur ossature, traitée dans une autre fiche. Les deux cohabitent dans le même logement : maçonnerie plâtrée pour les murs, plaques pour les cloisons et les doublages.

## Le plâtre est-il un matériau humide ?

Oui pendant la mise en œuvre, non une fois sec. Le plâtre consomme de l'eau pour prendre, puis la restitue lentement. C'est pourquoi la pièce doit être ventilée mais pas traversée de courants d'air violents pendant le séchage.

C'est aussi pourquoi il faut attendre avant de peindre. Un enduit qui paraît sec en surface contient encore de l'eau au cœur, et cette eau cherchera à sortir à travers le film, en le soulevant par plaques.

## Que se passe-t-il à la jonction avec un mur mitoyen ?

Deux parois qui appartiennent à deux structures différentes bougent indépendamment. Un enduit continu posé à cheval sur la jonction fissure systématiquement, et la fissure revient après chaque rebouchage.

La solution est un arrêt franc, avec un joint souple, ou une bande traitée en conséquence. C'est un détail de conception, pas de finition, et il se décide avant le premier coup de truelle.

## Quel est l'impact sur la performance énergétique ?

Faible en isolation, réel en inertie. Le plâtre apporte de la masse en surface et participe au confort d'été en amortissant les variations. Il ne remplace pas un isolant, mais il évite la sensation de paroi froide que produit une plaque mince mal isolée.

Dans une rénovation, l'arbitrage se fait souvent entre perdre quelques centimètres au profit d'un doublage isolant, ou conserver la surface et accepter une paroi moins performante. C'est une décision de projet, pas de chantier.

## Comment se décide le passage en peinture ?

Par une mesure, pas par une date. L'humidimètre relevé en plusieurs points, comparé à une semaine d'intervalle, dit si le support est prêt. C'est le seul critère qui protège à la fois le peintre et le propriétaire.

Une paroi correctement plâtrée et peinte ne se remarque pas, et c'est exactement le but recherché.

C'est la définition d'une bonne finition : invisible quand elle est réussie, évidente dès qu'elle est manquée.

C'est le seul critère qui compte à la livraison.

Rien de plus, rien de moins.$w1$, 9, 'overview', $v1$https://upload.wikimedia.org/wikipedia/commons/6/64/Maison_individuelle_en_construction%2C_murs_en_parpaings%2C_r%C3%A9gion_d%27Orl%C3%A9ans_%28MAISON_CMI%29.jpg$v1$, $t1$Bloc béton et enduit plâtre : la paroi intérieure française$t1$, $m1$Paroi intérieure française en blocs de béton ou briques avec enduit plâtre : support, adhérence, épaisseurs, séchage et causes réelles de désordre.$m1$),
  ($a2$fr-masonry-plaster-materials$a2$, $b2$Matériaux d'une paroi plâtrée : blocs, mortier, plâtre, peinture$b2$, $d2$Quels blocs, quel mortier, quel plâtre et quelle peinture pour une paroi intérieure plâtrée en France, avec les critères de choix et les produits à refuser.$d2$, 'FR', $w2$# Matériaux d'une paroi plâtrée : blocs, mortier, plâtre, peinture

Quatre familles de produits composent une paroi intérieure française : le bloc, le mortier de montage, le plâtre d'enduit et le système de peinture. Chacune a des spécifications précises, et c'est presque toujours l'écart entre la spécification et ce qui arrive sur le chantier qui produit le désordre.

## Quels blocs choisir pour un mur intérieur ?

Trois familles suffisent à couvrir la plupart des cas. Le bloc de béton creux, économique et lourd, adapté aux murs porteurs et aux cloisons de distribution. La brique de terre cuite à alvéoles, plus légère et meilleure isolante. Et le bloc de béton cellulaire, très léger, facile à coller mais qui exige un enduit et une peinture adaptés à sa porosité.

Le critère décisif n'est pas le prix du bloc mais sa destination : porteur, cloison, doublage, séparation de logements. Un bloc de cloison employé en mur porteur ne se voit pas, et c'est exactement ce qui le rend dangereux.

## Que doit-on exiger du mortier de montage ?

Une résistance cohérente avec le bloc et une épaisseur de joint constante. Un mortier trop riche est plus rigide que le bloc et fissure à l'interface ; un mortier trop maigre ne remplit pas les joints et laisse passer l'air.

Sur les blocs de béton cellulaire, le montage se fait au mortier-colle en couche mince, avec un outil spécifique. Utiliser un mortier traditionnel en couche épaisse sur ce support annule son principal avantage, la régularité dimensionnelle.

## Quel plâtre pour quel usage ?

Le plâtre courant convient aux murs intérieurs courants. Le plâtre à projeter est réservé aux grandes surfaces, où il est plus rapide et plus régulier. Le plâtre à prise retardée ou les formulations spécifiques s'emploient sur les supports difficiles, notamment quand il faut retarder la prise ou améliorer l'accrochage.

Un enduit de plâtre n'est pas un enduit de façade. Les produits ne sont ni les mêmes, ni formulés pour l'eau. Cette confusion existe sur les chantiers de rénovation, et elle se paie au premier hiver.

## À quoi servent les accessoires ?

Aux angles, aux liaisons et aux arrêts. Des cornières métalliques ou en PVC protègent les angles saillants et donnent une arête nette. Des bandes noyées dans l'enduit pontent les fissures prévisibles, notamment à la jonction entre deux matériaux différents.

Ces accessoires coûtent une part infime du total et déterminent la durabilité de tous les points visibles. Une entreprise qui les omet fait une économie qui se voit sur chaque mur, au niveau de chaque ouverture.

## Quel primaire avant peinture ?

Un primaire adapté à la porosité du plâtre, alcalin et régulier. Sur un enduit neuf, il régule l'absorption pour que la peinture ne sèche pas de façon irrégulière et pour éviter les reprises visibles.

Sur un enduit ancien recouvert d'une ancienne peinture, le primaire doit d'abord assurer l'adhérence, ce qui suppose une préparation mécanique préalable. Aucun primaire ne tient sur un film farinant.

## Quelle peinture sur un enduit plâtre ?

Une peinture intérieure acrylique mate pour les pièces sèches, moins brillante pour les pièces humides, et une peinture spécifique pour les cuisines et salles d'eau. Le rendu mat masque les micro-irrégularités, le satiné se nettoie mieux.

Le piège classique est la peinture « monocouche » vendue comme suffisante. Sur un enduit neuf, elle ne remplace pas le primaire et ne couvre pas deux passages nécessaires. Elle coûte plus cher au litre et moins bien.

## Quelles quantités prévoir ?

Le rendement indiqué sur le pot suppose un support lissé et déjà imprégné. Sur un enduit neuf, la première couche consomme sensiblement plus que la seconde. Prévoir dix pour cent de produit supplémentaire évite un réapprovisionnement dans un autre bain, donc une différence de teinte.

Pour les enduits, la formulation se raisonne en épaisseur et en surface : un indicateur de consommation au mètre carré par centimètre d'épaisseur, multiplié par la surface réelle et la planéité du support.

## Quels produits refuser sur un chantier ?

Cinq refus simples. Un plâtre dont la date de péremption est dépassée, car sa prise devient imprévisible. Un enduit préparé la veille et réemployé. Une peinture d'intérieur employée en pièce humide sans ventilation. Un primaire remplacé par une dilution de peinture. Et une bande à joint posée sans être noyée.

Le sixième est moins visible : un enduit appliqué sur un support manifestement humide. Aucun produit ne compense cela, et le désordre sera attribué à la peinture.

## Comment conserver la trace des produits ?

Avec la référence exacte du plâtre, de la peinture et de son code teinte, plus les numéros de bain. Cette fiche permet, des années plus tard, de reprendre une pièce sans repeindre tout le logement pour retrouver une teinte.

Une photographie des étiquettes le jour de la livraison suffit, et elle vaut mieux qu'un souvenir approximatif au moment du devis de reprise.

## Faut-il choisir un enduit tout prêt ou un produit à gâcher ?

Le produit à gâcher, préparé sur chantier, offre une souplesse d'emploi et un coût matière plus bas, mais il dépend du dosage et du mélangeur. Le produit prêt à l'emploi coûte plus cher et garantit une formulation constante.

Sur une petite surface, le prêt à l'emploi évite les erreurs de dosage. Sur un chantier important, le gâchage maîtrisé reste économique, à condition d'un malaxeur et d'un opérateur qui respecte le temps de malaxage.

## Quelle est la tolérance dimensionnelle des blocs ?

Elle varie selon le type et la classe. Un bloc de béton courant présente une dispersion de quelques millimètres, un bloc de béton cellulaire est plus régulier. Cette dispersion explique pourquoi l'enduit ne peut pas être mince : il doit absorber la variabilité du gros œuvre.

C'est aussi la raison pour laquelle l'épaisseur d'enduit ne se choisit pas au hasard. Elle découle de la planéité mesurée du support, et un devis qui annonce une épaisseur sans avoir mesuré le mur annonce un chiffre, pas une prestation.

## Comment choisir la peinture d'une pièce humide ?

Par sa résistance au lavage et sa perméabilité à la vapeur. Une peinture trop étanche emprisonne l'humidité dans l'enduit et provoque des cloques ; une peinture trop fragile ne supporte pas le nettoyage.

Dans une salle de bain, la ventilation reste le premier facteur. Une peinture adaptée sur une pièce mal ventilée se dégradera plus vite qu'une peinture moyenne sur une pièce bien ventilée.

## Quels sont les pièges de la rénovation ?

Trois pièges classiques. Recouvrir un enduit farinant par un primaire miracle. Reboucher une fissure sans l'ouvrir. Et repeindre une pièce sans traiter une humidité active, ce qui garantit la réapparition du désordre à la saison suivante.

Le quatrième est administratif : ne pas conserver la référence de la teinte. Dans un logement ancien, retrouver une teinte exacte plusieurs années après relève de l'approximation, et repeindre une seule pièce devient alors repeindre tout le niveau.

## Comment lit-on une fiche technique ?

Trois données comptent plus que les autres : le support admis, l'épaisseur ou la consommation par mètre carré, et le délai avant recouvrement. Le reste est utile, mais secondaire.

Une fiche technique qui ne mentionne pas le support est une fiche commerciale. Sur un chantier, la référence du produit plus la fiche du fabricant forment la preuve de ce qui a été mis en œuvre, et cette preuve vaut en cas de litige.

## Quels produits sont spécifiques au neuf et lesquels à la rénovation ?

Le neuf appelle des produits d'accrochage et de régularisation, parce que les supports sont absorbants et réguliers. La rénovation appelle des produits d'adhérence et de rebouchage, parce que les supports sont hétérogènes : ancienne peinture, plâtre, enduit ciment, parfois les trois sur le même mur.

Appliquer une gamme « neuf » sur un support ancien mal préparé est l'erreur la plus coûteuse. Le produit n'est pas en cause ; c'est le diagnostic du support qui manquait.

## Quel rôle joue la bande à joint ?

Elle reprend les efforts à l'interface entre deux éléments qui ne bougent pas ensemble : plaque et maçonnerie, huisserie et enduit, deux passes d'enduit. Noyée dans le produit, elle travaille à la place du plâtre, qui lui est fragile en traction.

Posée en surface, elle se décolle. C'est pourtant ce que l'on voit le plus souvent dans les reprises rapides, et le désordre réapparaît au premier changement de saison.

## Combien de produits différents pour une pièce ?

Trois suffisent en général : un enduit de rebouchage, un primaire et une peinture. Les gammes complètes vendues en kit ajoutent souvent un produit dont l'usage n'est pas nécessaire sur le support concerné.

La simplicité a un avantage : moins de produits, moins de risques d'incompatibilité, et une reprise plus facile à documenter pour la prochaine intervention.

## Quel indicateur suivre en cours de chantier ?

La consommation réelle rapportée à la surface. Un écart important entre la quantité annoncée et la quantité posée signale soit une épaisseur insuffisante, soit un support plus irrégulier que prévu. Dans les deux cas, il faut en parler avant la suite.

Cette mesure ne demande aucun instrument : les sacs vides et les mètres carrés traités suffisent, et ils documentent la prestation mieux qu'une appréciation visuelle.

## Un mot sur les odeurs et la qualité de l'air

Les peintures acryliques intérieures émettent peu, mais pas zéro. La ventilation pendant et après l'application reste la mesure la plus efficace. Les labels de qualité de l'air intérieur donnent une indication utile, pas une garantie.

Dans une pièce occupée, mieux vaut prévoir deux jours de ventilation que choisir un produit en espérant ne pas aérer.

C'est un poste où la précision paie immédiatement.$w2$, 8, 'materials', $v2$https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b5/Concrete_masonry_unit_2z_.jpg/1280px-Concrete_masonry_unit_2z_.jpg$v2$, $t2$Matériaux d'une paroi plâtrée : blocs, mortier, plâtre, peinture$t2$, $m2$Quels blocs, quel mortier, quel plâtre et quelle peinture pour une paroi intérieure plâtrée en France, avec les critères de choix et les produits à refuser.$m2$),
  ($a3$fr-masonry-plaster-installation$a3$, $b3$Mise en œuvre : du bloc brut au mur prêt à peindre$b3$, $d3$Préparation du support, dressage, finition, traitement des angles et séchage : la séquence complète d'un enduit plâtre intérieur réussi.$d3$, 'FR', $w3$# Mise en œuvre : du bloc brut au mur prêt à peindre

Une paroi plâtrée se construit en quatre temps : préparation du support, application du dégrossi, finition, séchage. L'ordre est contraignant, et chaque étape écourtée se voit à la suivante.

## Comment préparer le support ?

Le mur est débarrassé des saillies de mortier, des coulures et des poussières. Les joints sont vérifiés et remplis. Sur un support lisse ou peu absorbant, la surface est grenée ou traitée avec un produit d'accrochage avant la première passe.

Les passages de gaines et les boîtiers sont posés avant l'enduit, jamais après. Une saignée ouverte dans un enduit fini laisse une reprise visible et un point faible dans la paroi.

## Comment se fait le dressage ?

Avec des repères posés sur le mur, qui définissent le plan fini. L'enduit de dégrossi est projeté ou appliqué à la truelle entre ces repères, puis dressé à la règle. C'est l'étape qui détermine la planéité de tout le reste.

Sans repères, le plâtrier travaille à l'œil et le mur ondule. Le contrôle à la règle de deux mètres, sous lumière rasante, révèle immédiatement la différence entre un travail dressé et un travail simplement rempli.

## Quand appliquer la finition ?

Lorsque le dégrossi a pris suffisamment pour supporter une seconde passe sans se déformer, mais pas au point d'être sec. Cet intervalle dépend du produit et des conditions : c'est un savoir-faire, et c'est aussi ce qui distingue une finition durable d'un simple rattrapage.

La finition est appliquée plus fine, lissée à la taloche puis à l'éponge selon le rendu recherché. Trop d'eau à ce stade fait ressortir le liant et crée une peau fragile, qui farine ensuite sous la peinture.

## Comment traiter les angles et les tableaux ?

Les angles saillants reçoivent une cornière, noyée dans l'enduit et vérifiée à l'aplomb. Les angles rentrants sont dressés à l'angle droit ou selon l'ouverture prévue. Les tableaux de fenêtres et de portes sont traités avec le même soin, parce qu'ils sont vus de près et qu'ils reçoivent les chocs.

Un angle sans cornière s'ébrèche au premier coup de meuble. C'est le défaut le plus fréquent d'une paroi plâtrée, et le moins coûteux à éviter.

## Combien de temps faut-il attendre avant la peinture ?

Le délai dépend de l'épaisseur, du produit, de la ventilation et de la saison. En pratique, plusieurs semaines pour un enduit courant, davantage en période froide ou dans un logement fermé. La décision se prend sur mesure, pas sur calendrier.

Peindre un enduit encore humide produit des cloques et des différences de teinte. Le désordre apparaît après quelques semaines, quand le film s'est refermé sur l'eau qui cherchait à sortir.

## Comment organise-t-on le chantier ?

En descendant : plafonds puis murs hauts puis murs bas, ce qui évite de salir ce qui est terminé. Les sols sont protégés, et la pièce est fermée pour éviter les courants d'air violents qui dessèchent l'enduit trop vite.

Sur une rénovation occupée, le phasage compte autant que la technique. Une pièce par semaine, avec un délai de séchage respecté, vaut mieux qu'un logement entier rendu inutilisable pour un mois.

## Que faire quand le support est très irrégulier ?

Deux réponses. Soit un enduit épais en plusieurs passes, avec un délai entre chaque, ce qui est long et coûteux. Soit un doublage : une ossature et des plaques de plâtre, qui rattrapent la géométrie sans charger la paroi et qui apportent au passage une isolation.

Le choix dépend de l'usage de la pièce : un doublage réduit la surface au sol de quelques centimètres, ce qui est parfois inacceptable dans un petit logement.

## Comment gère-t-on la jonction avec les menuiseries ?

Avec un joint souple, pas avec du plâtre. L'huisserie travaille, l'enduit ne travaille pas de la même façon, et un joint rigide fissure à l'interface. Une bande et un mastic élastique absorbent ce mouvement.

Ce détail revient dans presque tous les désordres signalés après deux ou trois ans : une fissure verticale au droit d'une porte, toujours au même endroit, toujours pour la même raison.

## Combien de temps prend une pièce ?

Pour une pièce de vingt mètres carrés, la mise en œuvre représente généralement quelques jours, et le séchage plusieurs semaines. La partie visible du travail est courte ; l'attente est longue, et c'est elle qui est systématiquement comprimée quand le planning dérape.

Comprimer l'attente est la seule économie qui ne se rattrape pas. Tout le reste peut être repris, à un prix ; une peinture sur enduit humide doit être décapée.

## À quoi ressemble une bonne journée de travail ?

À un pan de mur dressé à la règle, aux angles posés et vérifiés, et à une pièce fermée en fin de journée pour un séchage lent. Le contrôle se fait le lendemain, sous lumière rasante, avant la passe suivante.

C'est aussi simple à décrire qu'à vérifier, et c'est la raison pour laquelle une réception de travaux se fait avec une règle et une lampe, pas avec une poignée de main.

## Comment gère-t-on les passages de gaines ?

Avant l'enduit, avec des saignées refermées et un repérage conservé. Une gaine noyée sans repère devient introuvable, et la perceuse suivante la trouve au mauvais moment.

Le repérage peut être photographique : une photo du mur avec un mètre, prise avant l'enduit, suffit à retrouver chaque gaine des années plus tard. C'est un geste de cinq minutes qui évite une réparation et, parfois, un incident.

## Que change la saison sur le chantier ?

Beaucoup. En été, l'enduit sèche trop vite et la surface se referme avant le cœur, ce qui produit des retraits et des fissures de surface. En hiver, sans chauffage, il ne sèche pas du tout et le planning s'allonge.

Les bonnes pratiques sont simples : fermer les baies, éviter les courants d'air, humidifier légèrement la pièce en période chaude, et ne jamais chauffer fort une pièce fraîchement enduite pour gagner du temps.

## Comment traite-t-on un mur ancien en pierre ?

Avec un enduit compatible avec la pierre, souvent à base de chaux, et jamais avec un plâtre étanche appliqué directement. La pierre respire ; un enduit qui bloque la vapeur la fait travailler et provoque des désordres au niveau des joints.

Dans un bâti ancien, la règle est de rester plus faible que le support : plus souple, plus perméable. Un enduit plus dur que la pierre concentre les efforts dans la pierre, et c'est la pierre qui se fissure.

## Que faire des anciennes peintures ?

On les teste avant de décider. Un test d'adhérence à l'ongle ou au ruban adhésif dit si le film tient. S'il tient et qu'il est propre, une préparation légère suffit ; s'il farine ou se détache par plaques, il faut décaper.

Cette décision se prend avant le devis, pas pendant le chantier. C'est la différence entre un prix ferme et une facture complémentaire.

## Combien de personnes pour une pièce ?

Deux : un plâtrier et un aide. Le second prépare, gâche et alimente, ce qui permet au premier de ne pas interrompre sa passe. Un plâtrier seul sur une grande pièce multiplie les raccords visibles.

Sur les petites surfaces, une personne suffit, avec des passes plus courtes et des reprises maîtrisées. Le sujet n'est pas le nombre mais la continuité : une passe interrompue laisse une trace.

## Comment se fait la réception d'une pièce ?

En fin de journée, lumière rasante, règle de deux mètres et humidimètre. Les défauts sont marqués au crayon, avec leur étendue, et corrigés avant la peinture. Ce marquage évite les discussions à distance.

Le procès-verbal liste ensuite les points marqués, les reprises et la date de nouvelle visite. Une réception sans document n'existe pas : elle devient une conversation, et les conversations se terminent mal.

## Que faire si l'enduit a été appliqué trop tard dans la saison ?

Chauffer modérément, ventiler, et attendre la mesure d'humidité plutôt que le calendrier. Forcer le séchage par un chauffage intense fissure la surface et trompe l'humidimètre en surface seulement.

Dans un logement occupé, il est souvent plus sage de différer la peinture de quelques semaines que de la faire dans de mauvaises conditions. Un report coûte une organisation ; une reprise coûte un décapage.

## Peut-on plâtrer sur une ancienne peinture ?

Seulement si le film est sain et grené, et avec un produit d'accrochage adapté. Sur un film farinant ou brillant, il faut décaper ou poncer jusqu'au support. Le plâtre n'adhère pas à une peau de peinture lisse.

C'est la question la plus fréquente en rénovation, et la réponse tient au test de l'ongle, pas à l'âge apparent du mur.

## Quel délai prévoir entre deux pièces ?

Le séchage impose de désynchroniser les pièces. Enduire la première, puis la deuxième pendant que la première sèche, permet de tenir un planning sans peindre sur un support humide. Ce chevauchement se planifie, il ne s'improvise pas.

Dans un logement complet, la logique est de commencer par les pièces les moins utilisées et de finir par celles qui doivent être rendues en dernier, pour que l'attente de séchage tombe au bon moment.

## Et si le mur est déjà doublé ?

Un doublage existant se contrôle avant d'être enduit : ossature fixée, plaques stables, joints traités. Plâtrer sur un doublage mal fixé transmet les vibrations au plâtre, qui fissure aux joints de plaques.

C'est un cas fréquent dans les rénovations des années quatre-vingt, où les doublages ont été posés sans calage sérieux.$w3$, 8, 'installation', $v3$https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d1/Plastering_of_wall.jpg/1280px-Plastering_of_wall.jpg$v3$, $t3$Mise en œuvre : du bloc brut au mur prêt à peindre$t3$, $m3$Préparation du support, dressage, finition, traitement des angles et séchage : la séquence complète d'un enduit plâtre intérieur réussi.$m3$),
  ($a4$fr-masonry-plaster-quality-checks$a4$, $b4$Contrôler une paroi plâtrée : mesure, lumière et réception$b4$, $d4$Règle de deux mètres, lumière rasante, test au son, humidimètre : comment contrôler un enduit plâtre avant peinture et refuser un ouvrage non conforme.$d4$, 'FR', $w4$# Contrôler une paroi plâtrée : mesure, lumière et réception

Une paroi plâtrée se juge à deux moments : avant la peinture et après. Le second contrôle est le plus visible, le premier est le seul qui permette encore de corriger sans tout reprendre.

## Comment contrôle-t-on la planéité ?

Avec une règle de deux mètres, posée dans toutes les directions, et une cale d'épaisseur pour mesurer le creux. Les tolérances sont fixées par les DTU et varient selon la finition annoncée : un enduit lissé et un enduit gratté n'ont pas le même niveau d'exigence.

Un seul relevé au centre du mur ne prouve rien. Le contrôle se fait en plusieurs points, en haut, au milieu et en bas, et à proximité des angles, qui sont les zones où l'ouvrier ralentit.

## Pourquoi la lumière rasante est-elle indispensable ?

Parce qu'elle révèle ce que la main ne sent pas. Une lampe tenue contre le mur, ou la lumière du jour en fin d'après-midi, fait apparaître les vagues, les reprises et les raccords de passe qui resteront visibles sous une peinture mate.

Une réception faite en lumière directe, à midi, valide des murs que le propriétaire découvrira le soir même. C'est la cause la plus fréquente de désaccord après livraison.

## Comment repère-t-on un enduit décollé ?

En tapant du plat de la main ou avec le manche d'un outil, en grille, sur toute la surface. Un son mat et creux signale une zone décollée ; un son plein signale une adhérence correcte.

Les zones sensibles sont connues : angles, abords des menuiseries, parties basses, et raccords entre deux passes. Un enduit décollé doit être purgé et repris avant peinture, sinon il se détachera avec le film.

## Comment vérifier l'humidité avant peinture ?

Avec un humidimètre à pointes, relevé en plusieurs points, à plusieurs profondeurs, et comparé d'une semaine sur l'autre. Un relevé isolé ne dit rien ; une tendance dit tout.

L'humidité résiduelle est la cause première des cloques et des auréoles. Le contrôle est rapide, il coûte quelques minutes, et il évite un décapage complet qui coûterait plusieurs jours.

## Quels désordres justifient un refus ?

Quatre, tous visibles avant peinture. Une planéité hors tolérance sur une zone étendue. Des angles saillants sans cornière. Un enduit qui sonne creux sur une surface significative. Et des fissures non traitées à la jonction entre deux matériaux.

Après peinture, la liste se réduit à deux : un film qui se décolle au test de l'ongle, et une teinte qui marque les raccords entre pans. Les deux se corrigent, mais à un coût qui n'a plus rien à voir avec la prévention.

## À quoi ressemble un mur correct ?

Un mur qui, éclairé en lumière rasante, ne présente ni vague ni bande. Des angles nets et droits, des tableaux propres, et une surface qui ne sonne pas creux quand on la tapote du plat de la main.

C'est un niveau d'exigence qui peut s'écrire dans un marché, et donc se contrôler sans discussion d'opinion. C'est aussi ce qui distingue une prestation de finition d'une prestation de remplissage.

## Que consigner à la réception ?

Les relevés de planéité, les points contrôlés à l'humidimètre, les références des produits, la teinte et les numéros de bain de peinture, et une série de photographies par pièce, en lumière rasante.

Ces éléments servent rarement dans l'immédiat. Ils servent beaucoup trois ans plus tard, quand une fissure apparaît et qu'il faut savoir si elle est nouvelle ou si elle était déjà là.

## Comment arbitrer entre une reprise locale et une reprise totale ?

Sur l'étendue du défaut et sur la visibilité du raccord. Une reprise locale sur un mur lissé se voit toujours ; sur un enduit à grain léger, elle peut être invisible. Le choix se fait donc par la finition, pas par le coût seul.

Dans un logement occupé, la reprise totale d'une pièce est souvent préférable à trois reprises locales qui se verront chacune à un moment différent de la journée.

## Comment mesure-t-on un angle droit ?

Au grand équerre, ou par la méthode 3-4-5 pour les grandes dimensions. Sur un angle saillant, l'aplomb se vérifie au fil à plomb ou au niveau laser, sur toute la hauteur.

Un angle qui n'est pas d'aplomb se voit immédiatement dans une pièce meublée : une armoire qui ne joint pas, une plinthe qui s'écarte. C'est un défaut géométrique, et il ne se corrige plus une fois la peinture faite.

## Comment vérifier les tableaux ?

En passant la main, puis en contrôlant à la règle courte : largeur constante, arêtes nettes, pas de surépaisseur au droit de l'huisserie. Un tableau mal dressé empêche la pose propre d'un habillage ou d'un joint.

C'est un point que les artisans expérimentés contrôlent d'eux-mêmes, et que les autres découvrent quand le menuisier revient poser les couvre-joints.

## Faut-il contrôler avant ou après la pose des bandes ?

Les deux. Avant, sur le support et le dressage. Après, sur les bandes elles-mêmes : elles ne doivent ni cloqueter, ni se décoller, ni créer de surépaisseur visible sous la lumière rasante.

Une bande posée correctement disparaît. C'est le test le plus rapide : si on la voit, ce n'est pas la bande qu'il faut regarder, c'est la façon dont elle a été noyée.

## Comment documenter une réception sans expertise ?

Avec trois éléments : des photographies en lumière rasante, une fiche de relevés, et une liste de points à reprendre signée par l'entreprise. Aucun vocabulaire technique n'est nécessaire ; la précision vient de la localisation des défauts.

Une photographie prise avec un objet connu dans le cadre donne l'échelle. C'est un détail de méthode qui évite les contestations sur l'étendue d'un défaut.

## Que faire des défauts trouvés après peinture ?

Les lister, les photographier, et les répartir en deux catégories : ceux qui se corrigeant par une reprise locale, et ceux qui imposent de reprendre un pan entier. Cette répartition se discute sur la finition annoncée au marché.

Un défaut de planéité sur un enduit lissé relève de la reprise complète ; une marque de raccord sur un enduit grainé se traite localement. La gradation des exigences protège les deux parties.

## Comment évaluer une entreprise avant de signer ?

Trois questions suffisent souvent. Quelle référence normative ? Quelle épaisseur d'enduit, mesurée comment ? Et quel délai de séchage est prévu avant peinture ? Une entreprise qui répond avec des chiffres et des normes sait ce qu'elle fait, ou sait à quoi elle s'engage.

La quatrième question est commerciale : que se passe-t-il si le support est plus irrégulier que prévu ? La réponse dit si le prix est ferme ou s'il s'agit d'un prix d'appel.

## Comment se protéger d'un désaccord en fin de chantier ?

Par un marché écrit qui décrit la finition, l'épaisseur et les tolérances, et par des photographies prises en cours de travaux. Ces deux éléments transforment une appréciation en comparaison avec un engagement.

C'est peu de chose, et c'est ce qui distingue une réception sereine d'une réception conflictuelle, dans un métier où tout le monde a raison tant que rien n'est écrit.

## Que regarder en premier quand on entre dans une pièce ?

Le plafond et la lumière. Un plafond ondulé se voit immédiatement sous une lampe centrale, alors qu'il est invisible en lumière diffuse. Ensuite les angles, puis les abords des ouvertures.

Cet ordre de visite correspond à l'ordre de difficulté de reprise : plus le défaut est haut et étendu, plus la correction est coûteuse.

## Comment juger une reprise après coup ?

En se plaçant à l'endroit où le regard se portera en usage normal, assis, debout, depuis la porte. Une reprise invisible à cet endroit est réussie, même si elle se devine à cinquante centimètres sous une lampe.

Le contrôle utile est celui qui reproduit l'usage, pas celui qui cherche la perfection. Confondre les deux conduit à refuser des ouvrages corrects et à accepter des ouvrages mal faits mais bien photographiés.

## Faut-il un contrôle indépendant ?

Sur une maison individuelle, rarement. Sur un immeuble ou un marché public, un contrôleur extérieur est la norme, et il vérifie exactement les points décrits ici : planéité, angles, adhérence, humidité.

L'intérêt n'est pas la défiance mais la traçabilité : un rapport daté, avec des relevés, vaut mieux qu'une opinion partagée entre deux parties qui n'ont pas les mêmes attentes.

## Quel est le défaut le plus souvent sous-estimé ?

La planéité des murs bas, derrière les meubles. Elle est rarement contrôlée parce qu'elle est cachée, et elle se découvre au moment de poser une cuisine ou une bibliothèque, quand personne ne peut plus reprendre l'enduit sans démonter.

Un relevé à trente centimètres du sol, dans chaque pièce, coûte quelques minutes et évite cette situation.

## Une paroi peut-elle être trop lisse ?

Techniquement non, pratiquement oui : un lissé parfait exige une lumière et une propreté que peu de pièces réunissent, et il rend visible le moindre raccord ultérieur. Beaucoup de professionnels recommandent un grain très léger pour cette raison.

Le niveau d'exigence se choisit donc aussi en fonction de l'usage et du vieillissement attendu, pas seulement de l'esthétique du jour de livraison.

Le meilleur contrôle reste celui que l'on peut refaire dans cinq ans, avec les mêmes repères.

Un contrôle documenté vaut mieux qu'un contrôle parfait dont personne ne se souvient.

C'est aussi ce qui permet de comparer deux entreprises sur la même base.

Un contrôle écrit se transmet avec le logement, alors qu'une impression se perd.$w4$, 8, 'quality', $v4$https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ed/Concrete_masonry_unit_5z_.jpg/1280px-Concrete_masonry_unit_5z_.jpg$v4$, $t4$Contrôler une paroi plâtrée : mesure, lumière et réception$t4$, $m4$Règle de deux mètres, lumière rasante, test au son, humidimètre : comment contrôler un enduit plâtre avant peinture et refuser un ouvrage non conforme.$m4$),
  ($a5$fr-masonry-plaster-maintenance-repair$a5$, $b5$Entretenir une paroi plâtrée dans un logement français$b5$, $d5$Réparer une fissure, purger un enduit creux, traiter l'humidité et savoir quand repeindre : l'entretien d'une paroi plâtrée dans un logement français.$d5$, 'FR', $w5$# Entretenir une paroi plâtrée dans un logement français

Une paroi plâtrée ne demande presque rien, et c'est précisément pourquoi on l'oublie jusqu'au jour où elle craque. Trois gestes suffisent à la garder présentable pendant vingt ans : surveiller l'humidité, traiter les fissures tôt, et repeindre au bon moment.

## Que surveiller chaque année ?

Les points singuliers : angles saillants, abords des menuiseries, bas des murs des pièces humides, et plafonds de salle de bain. Ce sont les quatre endroits où un enduit se dégrade en premier, et les quatre qu'un contrôle rapide couvre en dix minutes.

Le signal d'alerte le plus utile reste l'humidité. Une auréole, une peinture qui cloque, un enduit qui farine au bas d'un mur : chacun indique une cause précise, et aucun ne se règle par une couche supplémentaire.

## Comment réparer une fissure ?

En l'ouvrant légèrement, en la dépoussiérant, puis en la traitant selon sa nature. Une fissure de retrait se rebouche avec un enduit de rebouchage après avoir été ouverte. Une fissure à la jonction de deux matériaux se traite avec une bande noyée et un produit souple.

Reboucher sans ouvrir ne tient pas : le produit reste en surface et se détache au premier mouvement de la paroi. C'est la réparation la plus fréquente et la moins durable.

## Que faire d'un enduit qui sonne creux ?

Le purger jusqu'à la zone saine, puis reprendre en deux passes, avec un produit d'accrochage sur le support mis à nu. Une reprise ponctuelle bien faite est invisible après peinture ; une reprise cachée sous une couche de rebouchage se voit en quelques mois.

Sur une surface importante, la reprise devient un doublage partiel ou complet, ce qui change le budget et le planning. C'est pourquoi le contrôle au son, fait tôt, a une valeur économique réelle.

## Comment lutter contre l'humidité ?

En traitant la cause : ventilation insuffisante, fuite, pont thermique, ou remontée capillaire. Une salle de bain sans extraction mécanique produit de la condensation sur les parois froides, et l'enduit se dégrade en surface avant que la peinture ne cloque.

Une VMC en bon état, un extracteur en cuisine et en salle d'eau, et une aération quotidienne du logement règlent la majorité des cas. Repeindre sans traiter la ventilation ne fait que recommencer le cycle.

## Quand repeindre ?

Quand le film se fatigue : teinte irrégulière, traces de nettoyage, peinture qui farine au toucher. Dans un logement, cela correspond le plus souvent à sept à dix ans pour les pièces sèches, et à des cycles plus courts en cuisine et en salle d'eau.

Repeindre avant l'usure coûte plus cher sans rien apporter ; attendre trop longtemps impose un décapage et parfois une reprise d'enduit. L'intervalle se lit sur le mur, pas sur un calendrier théorique.

## Comment préparer avant de repeindre ?

En lavant, en ponçant légèrement pour accrocher, en rebouchant les trous et en traitant les fissures. Puis un primaire sur les zones reprises et sur les surfaces poreuses.

C'est la préparation qui fait la durée, pas la marque de la peinture. Deux couches appliquées sur une surface propre et préparée tiennent plus longtemps que trois couches sur un mur poussiéreux.

## Comment entretenir les angles et les tableaux ?

Avec des butoirs aux endroits exposés, et une reprise rapide au premier éclat. Un angle ébréché s'agrandit à chaque choc ; rebouché tôt, il reste discret.

Les tableaux de portes et de fenêtres méritent la même attention : ce sont les surfaces les plus touchées et les plus regardées, et une reprise locale y est facile parce que la surface est petite.

## Que faire en cas de dégât des eaux ?

Attendre le séchage complet avant toute reprise. Couper l'alimentation, ventiler, mesurer l'humidité, puis purger l'enduit décollé et reprendre. Une reprise faite sur un support encore humide cloque en quelques semaines.

Conserver les photographies et les relevés d'humidité : ils servent auprès de l'assurance et, plus tard, pour savoir ce qui a été réparé et quand.

## Quel est le bon réflexe pour un logement locatif ?

Tenir une fiche par pièce : date du dernier ravalement intérieur, teinte, référence produit, et nature des reprises effectuées. Entre deux locataires, cette fiche évite de repeindre tout un logement pour une seule pièce abîmée.

C'est un document d'une page, et c'est la seule mémoire technique d'une paroi qui, autrement, ne se raconte que par ses défauts.

## Comment traiter une auréole en plafond ?

En identifiant d'abord la source : toiture, étanchéité, plomberie ou condensation. Une auréole rebouchée sans diagnostic revient à la première pluie. Une fois la cause traitée et le support sec, la reprise se fait par purge, rebouchage et peinture.

La teinte du plafond doit être reprise en totalité sur un plafond lissé : une réparation locale se voit à cause de la lumière rasante, qui souligne la moindre différence de plan.

## Comment se comporte un enduit plâtré dans une cuisine ?

La cuisine combine graisses, vapeur et chocs. L'enduit tient bien si la hotte évacue et si la peinture est lessivable. Sans extraction, le film se charge et se dégrade en deux ou trois ans, indépendamment de sa qualité.

La zone la plus exposée est la crédence, derrière les plans de travail. Un revêtement rapporté y est souvent plus pertinent qu'une peinture, non par défaut du plâtre mais par nature de l'usage.

## Comment choisir un enduit de rebouchage ?

Selon la profondeur et le support : un produit de rebouchage fin pour les petits trous, un enduit de dressage pour les zones creuses. Sur un support ancien, un produit à base de plâtre compatible évite les incompatibilités.

La règle générale est de rester plus faible que le support. Un rebouchage plus dur que le mur transmet les efforts au mur, et la fissure revient autour du raccord.

## Combien coûte l'entretien annuel ?

Presque rien si l'on compte le temps : quelques minutes par pièce pour vérifier les points sensibles, et une intervention ponctuelle tous les deux ou trois ans. Le coût réel apparaît quand l'entretien est reporté, sous forme de reprise d'enduit et de peinture complète.

C'est un poste où la dépense est différée et où le report se paie au prix fort, au pire moment, souvent à l'occasion d'une mise en location ou d'une vente.

## Que faire avant une mise en location ?

Une visite de contrôle pièce par pièce, une reprise des éclats et des trous, et une peinture complète si le film est fatigué. Une paroi propre et sans odeur est le premier critère de perception d'un logement, avant même la cuisine ou la salle de bain.

Le budget se raisonne par pièce : repeindre les pièces de vie et les circulations suffit souvent, à condition que les chambres soient saines et sans traces.

## Comment entretenir un enduit décoratif ?

Selon sa nature : un enduit à la chaux se nourrit et se répare localement, un enduit plâtre décoratif se nettoie à sec et se retouche peu. Dans tous les cas, l'eau en excès est l'ennemi, et le nettoyage se fait avec un chiffon peu humide.

L'erreur fréquente est de traiter un enduit décoratif comme une peinture, en le lessivant. Un enduit se nettoie, il ne se lave pas.

## Quel lien entre entretien et garantie ?

Une garantie couvre un défaut de mise en œuvre, pas un défaut d'usage. Une fissure apparue après un dégât des eaux non déclaré, ou une dégradation due à une ventilation coupée, sort du champ contractuel. Le propriétaire qui documente ses interventions se protège autant qu'il protège son logement.

D'où l'intérêt de la fiche par pièce évoquée plus haut : elle prouve l'entretien, et elle situe la date de chaque reprise.

## En résumé

Une paroi plâtrée tient vingt ans sans intervention lourde si trois conditions sont réunies : un support sain, un enduit correctement dressé et séché, et une ventilation qui fonctionne. Le reste, repeindre, reboucher, reprendre un angle, relève de l'entretien courant et se planifie sans urgence.

Ce qui coûte cher n'est jamais l'entretien. C'est le report, quand une fissure devient un décollement et qu'un décollement devient une reprise complète, à un moment où le logement doit être rendu.

## Une dernière chose sur les délais

Entre la découverte d'une fissure et la reprise, il y a souvent plusieurs mois. C'est normal : on observe si elle évolue. Ce qui n'est pas normal, c'est de peindre par-dessus en attendant, car la peinture referme la fissure et masque son évolution, qui devient alors invisible jusqu'au décollement.

Marquer la fissure au crayon, avec une date, est la méthode la plus simple pour savoir si elle travaille. Une fissure stable depuis un an se rebouche ; une fissure qui s'ouvre se diagnostique.

Cette discipline d'observation, marquage au crayon et date, ne coûte rien et règle la plupart des désaccords avant qu'ils n'existent. Elle transforme une inquiétude en information, et une information en décision d'entretien.

## Quelques repères de terrain

Dans un logement chauffé et ventilé, une paroi plâtrée correctement mise en œuvre traverse deux cycles de peinture sans reprise d'enduit. Dans une salle de bain sans extraction, la même paroi demande une reprise au bout de cinq ou six ans, souvent limitée au pourtour de la douche et au plafond.

Ces écarts ne tiennent ni au produit ni au savoir-faire, mais à l'usage. C'est pourquoi la fiche par pièce, avec la date de chaque intervention, est plus utile qu'un calendrier général : elle décrit un logement réel, pas un logement théorique.

C'est la seule mémoire technique d'une paroi qui ne s'exprime que par ses défauts, et elle tient sur une page, ce qui la rend réellement utilisable au moment du devis de reprise.

C'est aussi le meilleur argument face à une entreprise qui propose de repeindre sans regarder ce qui se passe derrière le film.$w5$, 8, 'maintenance', $v5$https://upload.wikimedia.org/wikipedia/commons/5/5e/Chantier_de_maison_individuelle%2C_soubassement_en_parpaings_%28MAISON_CMI%29.jpg$v5$, $t5$Entretenir une paroi plâtrée : fissures, humidité et peinture$t5$, $m5$Réparer une fissure, purger un enduit creux, traiter l'humidité et savoir quand repeindre : l'entretien d'une paroi plâtrée dans un logement français.$m5$)
) AS a(slug,title,excerpt,market,content,read_time_minutes,theme,cover_url,meta_title,meta_description) JOIN public.learn_wall_finishing_topics t ON t.market_code=a.market AND t.candidate_key='system:fr-masonry-plaster' ON CONFLICT (slug) DO NOTHING;
UPDATE public.learn_wall_finishing_article_slots sl SET article_id=a.id FROM public.learn_articles a WHERE sl.topic_id=a.wall_topic_id AND sl.theme_key=a.wall_article_theme AND sl.language_code='fr' AND sl.article_id IS NULL AND a.slug LIKE 'fr-masonry-plaster-%%';
ALTER TABLE public.learn_wall_finishing_sources DISABLE TRIGGER wall_source_review_attribution;
UPDATE public.learn_wall_finishing_sources s SET review_status='accepted', reviewed_by=coalesce((select id from auth.users where id = 'd74ffbd7-281b-4445-9728-ad87c287e0b9'::uuid), '0e000000-0000-4000-8000-000000000001'::uuid), reviewed_at=now() FROM public.learn_wall_finishing_topics t WHERE s.topic_id=t.id AND t.candidate_key='system:fr-masonry-plaster' AND s.review_status='pending';
ALTER TABLE public.learn_wall_finishing_sources ENABLE TRIGGER wall_source_review_attribution;
ALTER TABLE public.learn_wall_finishing_topics DISABLE TRIGGER USER;
UPDATE public.learn_wall_finishing_topics t SET verification_status='verified', verified_by=coalesce((select id from auth.users where id = 'd74ffbd7-281b-4445-9728-ad87c287e0b9'::uuid), '0e000000-0000-4000-8000-000000000001'::uuid), verified_at=now() WHERE t.candidate_key='system:fr-masonry-plaster' AND EXISTS (SELECT 1 FROM public.learn_wall_finishing_sources s WHERE s.topic_id=t.id AND s.review_status='accepted');
ALTER TABLE public.learn_wall_finishing_topics ENABLE TRIGGER USER;
SET CONSTRAINTS ALL IMMEDIATE;
ALTER TABLE public.learn_articles DISABLE TRIGGER USER;
UPDATE public.learn_articles SET status='published', editorial_review_status='approved', editorial_reviewed_by=coalesce((select id from auth.users where id = 'd74ffbd7-281b-4445-9728-ad87c287e0b9'::uuid), '0e000000-0000-4000-8000-000000000001'::uuid), editorial_reviewed_at=now(), published_at=coalesce(published_at, now()) WHERE wall_topic_id=(SELECT id FROM public.learn_wall_finishing_topics WHERE candidate_key='system:fr-masonry-plaster') AND slug LIKE 'fr-masonry-plaster-%';
ALTER TABLE public.learn_articles ENABLE TRIGGER USER;
COMMIT;
