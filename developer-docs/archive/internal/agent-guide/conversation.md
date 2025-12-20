iono

 — Yesterday at 6:12 PM
consistensyc in the image theming and mindless ease
Valdemarr (Mike) — Yesterday at 6:12 PM
Right
iono

 — Yesterday at 6:13 PM
making it dungeon master i feel like is okay beucase if its a roguelike, there WILL be just terrible runs
but giving it too much control on the minutia i think would still get us into trouble
its good at roleplaying, not managing
Valdemarr (Mike) — Yesterday at 6:13 PM
Or if cheaper than an artist don't once for all the pixel art amd then reuse them, edit them haha
iono

 — Yesterday at 6:14 PM
yea metadat is updatabale os i start with crappy crappy ones and technically i dont even have to show the items yet
but also thats what people like right, trading cards and fidget spinners
Valdemarr (Mike) — Yesterday at 6:14 PM
I'd legit use emojis
Emojis are my placeholders for everything
iono

 — Yesterday at 6:14 PM
ai already understand st that pretty well too
Valdemarr (Mike) — Yesterday at 6:14 PM
⚔️
iono

 — Yesterday at 6:14 PM
K,I,S.S.
Valdemarr (Mike) — Yesterday at 6:14 PM
Omg 2 swords
iono

 — Yesterday at 6:15 PM
dual wield or one handed w a shield or two handed
Valdemarr (Mike) — Yesterday at 6:15 PM
💣
iono

 — Yesterday at 6:16 PM
yea see i want to build a wreckless rogue who ends up killing my freinds chars w a bomb and we all fail
i feell ike thats worth the repost right
Valdemarr (Mike) — Yesterday at 6:16 PM
Yeah lol
Critical fail, sets a trap and kills everyone
Anyway. Letting my mind vegetate for a half a hour here. Then I'll push an item contribution
It'll be parametric and adaptable 
So it can be tweaked
Hopefully the ai will build something where u set some paramters, generate 100 items, and get a distribution of drops
And if it's like 80 wood swords, 10 iron swords, 9 steel swords, and 1 magic sword, you can then adjust the parameters and make it lean more in one way or another 
iono

 — Yesterday at 6:23 PM
cool bc i just met a massive build error from the merge and am working it out give a few
iono

 — Yesterday at 6:42 PM
okay the error irs fixed
Valdemarr (Mike) — Yesterday at 7:06 PM
took a shower, laid down for a bit
design time
iono

 — Yesterday at 7:16 PM
cool
took quinn home ealrier she just alled me like, how do i play cuphead
Valdemarr (Mike) — Yesterday at 7:17 PM
LOL
cup head is hard
iono

 — Yesterday at 7:17 PM
it is, i just got hera a siwtch gift card and walked her though puttin the code in and starting the download over hte phone
shes playing sax, currently memorization is stil la fun puzzle for her so i try ot encourage it
Valdemarr (Mike) — Yesterday at 7:41 PM
making a standalone html tool for testing item drop rate
iono

 — Yesterday at 7:42 PM
smart
Valdemarr (Mike) — Yesterday at 7:42 PM
the ai is really thorough
like, it can knock out the complete compendium of DnD style items in one prompt
i was gonna make a simple version by hand
but like, it just did all items accessible in a DnD game im pretty sure
iono

 — Yesterday at 7:43 PM
hahaha
Valdemarr (Mike) — Yesterday at 7:44 PM
i feel like some style will be lost if we let the scope get that large
because right now u got this neat little pixel idle interface
and if there's 5000 items all obvious of DnD design i dont think it will mesh well
iono

 — Yesterday at 7:44 PM
no and we can always evolve it
i just did pixels bc is easier
Valdemarr (Mike) — Yesterday at 7:49 PM
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>InnKeeper - Procedural Item Generator Test Tool</title>
Expand
item-generator-tool.html
34 KB
U can drop it in browser and try
It is cool but the scope is kinda, more than we can chew
iono

 — Yesterday at 7:50 PM
im on the big contract
Valdemarr (Mike) — Yesterday at 7:51 PM
i did 100 level 1 dungeon loot with 100% rarity mod
68 common items, 14 uncommon, 11 rare, 7 epic
which is honestly a pretty good distribution. 0 legendary 0 artifact
very power law
it devised this without me telling it
common: 65%      (65%)
uncommon: 22%    (22%)
rare: 8%         (8%)
epic: 4%         (4%)
legendary: 0.8%  (0.8%)
artifact: 0.2%   (0.2%)
Total: ~100%
iono

 — Yesterday at 7:54 PM
mcice
nice
Valdemarr (Mike) — Yesterday at 7:55 PM
Image
to trim the fat, i think we can get rid of consumables, jewelry
iono

 — Yesterday at 7:56 PM
yea, i am thinking like, well did you see the players yet
Valdemarr (Mike) — Yesterday at 7:56 PM
breifly, then it crashed and now i dunno
iono

 — Yesterday at 7:56 PM
theres only 4 archetypes, one weapon for each, one or two standard armor sets
Valdemarr (Mike) — Yesterday at 7:56 PM
aite
i did ask the ai to figure that out from the code and relay the info but it thought- nahhhhh here have all classes ever conceived 
im trimming the fat, and then will try and sprinkle in unqiues
there will be 4 tiers of rarity, 1 weapon per class, 2 armor slots, and then the fun part will be just plopping in like, hermes boots and daedallus' hammer or whatever we can think of
iono

 — Yesterday at 8:03 PM
that sounds good bc we can add hats gloves and boots quickly if it takes off and then vanity items, all roll modifiers for ingame but less difficult
and consumables and stuff after that
Valdemarr (Mike) — Yesterday at 8:05 PM
i gotta eat something, brb
Valdemarr (Mike) — Yesterday at 8:30 PM
Longsword → requiredClass: 'warrior'
Staff → requiredClass: 'mage'
Dagger → requiredClass: 'rogue'
Mace → requiredClass: 'cleric'
Full Plate, Chain Mail → requiredClass: 'warrior'
Mage Robes, Enchanted Cloak → requiredClass: 'mage'
Leather Armor, Studded Leather → requiredClass: 'rogue'
Scale Mail, Breastplate → requiredClass: 'cleric'
iono

 — Yesterday at 8:31 PM
ohhh niiice can we make it balance the output of each type relative to the amount of each type that exists in worrld
this would suppor thte ecomony, if only 100 swords man, only so many swords and maybe the barbairnas have them
rolled them
Valdemarr (Mike) — Yesterday at 8:32 PM
i imagine so. it will pull data from??
just some log history of generated items?
iono

 — Yesterday at 8:34 PM
let me think about htat i htink it'll just be a columb in the supabase db like
everytime one is actually minted, it'll tick up, and then you'll always have one static reference
Valdemarr (Mike) — Yesterday at 8:35 PM
yeah that approach is probably like 10 lines of code max too
iono

 — Yesterday at 8:35 PM
round those tallies to percentages and weight distrubition
Valdemarr (Mike) — Yesterday at 8:35 PM
ill actually include it in my contribution
iono

 — Yesterday at 8:35 PM
well did you pull the new one
Valdemarr (Mike) — Yesterday at 8:35 PM
still sort of, reversing a lot of the stuff it added from the first design
iono

 — Yesterday at 8:35 PM
build in the thing now as much as you ccan
Valdemarr (Mike) — Yesterday at 8:36 PM
like, all the modifiers like sword of LIFESTEAL or armor of REGENERATION are all still in there but those modifiers dont do anything
iono

 — Yesterday at 8:36 PM
those are the fun ones well make them a priority if we gt paid
lifesteal regen ai battle bot GO
Valdemarr (Mike) — Yesterday at 8:37 PM
i feel like we could definitely have stuff like that, but every modifier just asks for another battle variable. i can leave it in if you just want the ai to sort it when you integrate 
actually, you know what
yeah, that will be a piece of cake for the ai to sort
and its coming together now
iono

 — Yesterday at 8:38 PM
its just a diablo roling engine
dont even have to learn on the ai that much as much a you are thinking its just an element that choses the rolls and can stick together scripts instead of dice
Valdemarr (Mike) — Yesterday at 8:38 PM
the player's strat may involve the party selecting their equipment
"dungeon delve with as much regen as possible"
and the agent equips all their regen gear
iono

 — Yesterday at 8:39 PM
now your getting the right kind of stupid
Valdemarr (Mike) — Yesterday at 8:39 PM
OKAAAAAY DUTCH
this makes sense
we got a game here
iono

 — Yesterday at 8:39 PM
haha
wiat till you grasp what i've manaced with the ecosystem
i mean theyre all failures until they arent but im trying to stay ahead of the curve and use as many tricks as possible
Valdemarr (Mike) — Yesterday at 8:40 PM
Flaming — Fire damage/effect
Frost — Cold damage/effect
Shock — Lightning damage/effect
Venomous — Poison damage/effect
Regeneration — Health regeneration over time
Lifesteal — Heal on damage dealt
Fortified — Defense/resistance bonus
Swift — Speed/movement bonus
8 modifiers exist
iono

 — Yesterday at 8:40 PM
damn those are so easy to bake in
Valdemarr (Mike) — Yesterday at 8:40 PM
all cosmetic at the moment, intuitive for the agent to implement when it comes to their contribution to the battle mechanics
iono

 — Yesterday at 8:41 PM
we dont have it yet but the dungeon mster and hero prompts ai we can tell them<

YOu can do one creative thing per crawl with an element form items

most of the gameplay can be diablostule rolls
idk know the game but like, when you move, the enemy moves, and its tiles, there are a bunch of them, but its a roguelike, so maybe we "model" the simulated game like that, circling back to my excel thing idea
bc then its just, party is at x, y, enemies at this that, party can move chess pieces style or whatever, mele, distance, spells,

then flalovr the adventure with some ai mishaps and stuff
dungeonmaster rolls add chaos, etc
that was very tangential but i just figured alot more out
Valdemarr (Mike) — Yesterday at 8:44 PM
yee
iono

 — Yesterday at 8:49 PM
each dungeon 100 levels, icnreasing difficulty

idle mechanies that hsould also be doable
Valdemarr (Mike) — Yesterday at 8:57 PM
there is a hypothetical pool of 100 of each item type available day 0 game-wide. as items are generated a counter increments keeping track of each item type, and reducing the weight of that item appearing again by 1 out of the total number of all other items remaining, so the drop rate is weighted based on availability
iono

 — Yesterday at 8:57 PM
but are we randomly genarting a fair amount to begin with
or roughly so
Valdemarr (Mike) — Yesterday at 8:58 PM
to begin with its 100 swords available, 100 staves, 100 daggers, so on
so its equal
iono

 — Yesterday at 8:58 PM
or am i wrong in asking that, i mean 100 items should be like, a few crawls anwyay  right i am thinking 1-2 per person per crawl
Valdemarr (Mike) — Yesterday at 8:58 PM
depends on how frequent getting loot is game-wide
iono

 — Yesterday at 8:58 PM
okay, should porbably not use 100 and consider it being 0 or infinity though bc you cant hardset a thing like that right?
if it tone day viral akes off were talking 10k TX's in an hour
Valdemarr (Mike) — Yesterday at 8:59 PM
if one person shows up with BANK and runs dungeons 1200 times, they'll literally get every item in the game
so it depends if u want to hard cap item allotment like that, per dungeon or game-wide
iono

 — Yesterday at 9:00 PM
ohhh boy im restructing ALOT rn lol
i guess ia m thinking roguelike as in many instanses
andi was thining party max of 5, 100 levels, thast like, theyd each carry home to many things
Valdemarr (Mike) — Yesterday at 9:00 PM
diablo has like, a master table of items, and then creates a loot tables based on the instance
iono

 — Yesterday at 9:01 PM
i should probaly read something on this
Valdemarr (Mike) — Yesterday at 9:01 PM
so like, killing the countess in act 1 has a higher chance of getting runes for example
imagine, if a dungeon is themed to be some sort of goblin pit, you wouldn't see many drops from harpies
goblins might drop a lot of swords and leather armors
iono

 — Yesterday at 9:02 PM
les imagine that the base item sets can either be traded or later we include like melting down or crafitng or somthing?
right this is true
and also the level of consideration required
Valdemarr (Mike) — Yesterday at 9:02 PM
yeah, so its using 4 of the D&D rarities for tiers
common, uncommon, rare, and legendary (i think)
in D&D, uncommon weapons for example carry a +1 to hit modifier. makes them easier to hit with
they dont scale damage like every other game in existence
for good reason too
iono

 — Yesterday at 9:04 PM
yea i figure for now equips ar ethe only thing that can affect stats
Valdemarr (Mike) — Yesterday at 9:04 PM
in WoW you end up getting stat creep 
its like, the more you develop the game, the more you just tack on bigger damage numbers
and thats good 99% of the time, but its very tired
in D&D, your higher tier items do more damage, but you also hit easier, or get a modifier like lifesteal or regen
this avoids stat creep
iono

 — Yesterday at 9:05 PM
it also leads to the builds i enjoy
Valdemarr (Mike) — Yesterday at 9:06 PM
honestly a very wide variety of modifiers is more strategic
if the items progress simply via bigger number do more, its flat and tired
iono

 — Yesterday at 9:07 PM
yea im also thinig about like right
this is literally for on the toilet and subway so a mindless recap of someting
Valdemarr (Mike) — Yesterday at 9:25 PM
this is fun
we're game devs
The Cove Game Studio
iono

 — Yesterday at 9:26 PM
hahaha
only took a decade to figure it out
Valdemarr (Mike) — Yesterday at 9:26 PM
needed ai agents to be invented
i been doing game design the whole time
iono

 — Yesterday at 9:26 PM
i have been coding the whole time
Valdemarr (Mike) — Yesterday at 9:26 PM
just, rarely in GML and in my head
iono

 — Yesterday at 9:26 PM
i just accumulated enough knowledg
Valdemarr (Mike) — Yesterday at 9:31 PM
im gonna push
its like we laid out, 4 weapons, 8 armors, class specifications, 4 tiers of items, 8 modifiers for strategy, distributions based on a couple different paradigms (dungeon loots/mosnter drops/boss drops/vendor stock/quest rewards), a weighted/capped item system (can just be deleted if it doesnt fit what we're trying to do), can plug in with the provenance contribution from last time so if everything gels together then every item will have a place in the world or a history or a story behind it
iono

 — Yesterday at 9:37 PM
ok
Valdemarr (Mike) — Yesterday at 9:37 PM
its pushing
iono

 — Yesterday at 9:37 PM
im breating my head againts some connection issues and then i ahve to test the contracts
and then i can tie them to the game
Valdemarr (Mike) — Yesterday at 9:37 PM
i dont know how to do any git shit i just tell the agent to do it
iono

 — Yesterday at 9:37 PM
and then we can test the gameplay ish and luanch
Valdemarr (Mike) — Yesterday at 9:37 PM
bunch of magic happens
iono

 — Yesterday at 9:37 PM
you push to yours then you go to github
and manually go to your repo page, find pull reuewsts up to, and ask to do one from your branch tom ine and then i get a email
Valdemarr (Mike) — Yesterday at 9:38 PM
oke cool
Valdemarr (Mike) — Yesterday at 9:46 PM
did it email u
iono

 — Yesterday at 9:49 PM
it didnt email me but its ther
Image
Valdemarr (Mike) — Yesterday at 9:49 PM
yeeee
doin the game dev thang
iono

 — Yesterday at 9:49 PM
probly on me for sync notifs or osmething
i submitted my first PR to that eliza guy
did i tell you he gave me a bounty
Valdemarr (Mike) — Yesterday at 9:50 PM
yes but i didnt really understand what u were showing me
i knew u were talkin to an "in" guy
thats it
haha
iono

 — Yesterday at 9:51 PM
i am officailly on the heels of the people out there doing on
Valdemarr (Mike) — Yesterday at 9:51 PM
nice
iono

 — Yesterday at 9:51 PM
i hope dude, one of these things is goig to break through
Valdemarr (Mike) — Yesterday at 9:52 PM
fun for me either way
iono

 — Yesterday at 9:55 PM
yea i enjoy it most of the time
im stuck at stupid bullshti thing right now and getting irritated and sleepy
gotat build a discord hahaha
Valdemarr (Mike) — Yesterday at 10:04 PM
yeah im about to go to sleep
iono

 — Yesterday at 10:04 PM
i very much need ot
i have made a mess
Image
something i hink is simple like, make a copy of this folder, and then this copy is wrapped for web and this copy is wrapped for mobile
just isnt.
Valdemarr (Mike) — Yesterday at 10:06 PM
kinda looks like its workin
iono

 — Yesterday at 10:06 PM
one is