# Soccer coach companion app requirements and workflow

Source package: 20260713-205954-6E0697D6-context

Duration: 33:32

## Summary

The memo outlines requirements for a soccer coach companion application to replace spreadsheet-based scheduling and game-day administration. The main needs are generating and viewing player-position schedules, tracking substitutions and game clock during games, balancing playing time across positions over a season, and supporting quick review, printing, and sharing for coaches and parents.

## Key Points

- Current workflow uses Excel to assign girls to positions across game time slots.
- Core need is a valid, quickly generated schedule that can be reviewed and adjusted before game day.
- Game-day mode should combine timer, current lineup, and substitution tracking.
- The app should support different roster views, printing, sharing, and possibly a mobile-first iOS experience.
- Additional useful features include availability tracking, seasonal playtime balance, calendar invites, and optional field visualization.

## Transcript

### Project context and the coaching problem

Time: 0:01 - 2:24

#### Summary

Introduces the app idea as a tool for coaching a daughter’s under-10 soccer team, focused on handling substitutions, position changes, and the basic administration around game day.

#### Transcript

[0:01] Alright, here we go.

[0:06] This one will be a little off the beaten path.

[0:11] It's going to be the discussion of requirements and goals for a soccer coach's companion application.

[0:22] Soccer coach being the person who would use it, companion application being just a tool that helps soccer coach with all the small things that require some administration.

[0:38] Context for this is that I'll be coaching again for my daughter's soccer team.

[0:45] The under 10 league.

[1:02] More specifically the changing positions and the substitutions throughout the quarters of the game.

[1:15] And within each quarter, there's typically a sub at the halfway mark.

[1:21] 14-minute quarters, sub every seven minutes, and you need to communicate to the girls.

[1:38] Here's what they'll be playing throughout the game.

[1:46] Build a schedule as part of it, being able to feed the schedule on game day, the other part of it, being able to keep track of the half, the quarter, and just the clock is another piece of it.

[2:01] And sometimes during the game, there's unexpected substitutions.

[2:07] And so that's probably the one stretch sort of goal.

[2:12] Being able to keep track of those, make them, unmake them, that sort of thing.

[2:20] Okay, so that's kind of the general context.

[2:23] What are we doing today?

### Current spreadsheet-based schedule structure

Time: 2:28 - 5:01

#### Summary

Describes the existing Excel workflow and how schedules are organized by game, player, and time chunk, including why position-based rows are easier to read during a match.

#### Transcript

[2:24] What's the overall flow here?

[2:28] Today, the other coach, Coach T is using Microsoft Excel, and he's got some sort of a template where each game is a sheet in Excel.

[2:46] Each girl is a row in Excel.

[2:55] Each column represents a chunk of play time.

[3:43] So when it's arranged like that, you go and check the positions and the current time period, and then you can read off which girls are playing where they all are uh differently able to answer questions.

[4:01] The position roundup is honestly a little bit easier.

[4:05] So listing where the position is each row works slightly better because during the game it's easier to just read off the positions and then the girl's name.

[4:16] And then if you're trying to make sense of is somebody in the right position, the correct position during the game, it's a lot easier to see the position and who's supposed to be there than it is to go find a girl's name who you think should be there and figure out where they actually are.

[4:35] Regardless, they're all basically the same sort of tuple or mapping.

[4:41] You've got a girl, you've got a time span, you've got a position, and then it's just a matter of how you render them.

[4:56] What's the labeling?

### Roster, availability, and position model

Time: 5:01 - 8:07

#### Summary

Defines the roster and game-specific availability rules, then lays out the position structures used in different formations and the ways those positions map to assignments.

#### Transcript

[4:56] What's the labeling?

[5:01] The team members are the same.

[5:11] Not one wrinkle there is uh depending on the game, um are not available, maybe vacation, maybe sick, maybe they need to leave for a birthday party.

[5:22] I think the simplest way to do it is to say that they are available or not for given game that works pretty well then what are the positions that are available well we've played a couple different ways uh any given game there's seven on the field the crack you've got a goalie we uh we're playing two three two I think we did I can see seven two three two and goalie um or alternatively a one two one two one have we played that I don't know two two two one I am honestly I can't remember at this point two two two maybe that's what it was maybe it's six and an OI gives you seven I can believe that and you got four on the sidelines typically so then we would have played uh two two two or before that we would have played uh one two two one close those gets you the sixth all right I believe that okay well regardless of I ignorance of what positions we had when he assigned them eventually.

[7:19] Um I wasn't making the schedules.

[7:23] Um, more seriously, we had uh particular layouts we were going for, uh 222 is correct, one two, two, one is also correct.

[7:33] Um for those layouts, you've got positions, uh forward, right mid, left mid, sweeper, uh left defense, right defense, that kind of thing.

[7:47] And where we left the end of the season was with the 222, so basically just right and left, uh forward mid defense, then a goalie.

[7:57] And with those positions, you've then got the ability to assign team members to the position before game.

### Schedule quality goals and constraints

Time: 8:07 - 15:32

#### Summary

Explains the constraints the schedule should satisfy, including variety, goalie rotation, midfield swaps at halftime, and roughly equal total playing time across the season.

#### Transcript

[7:57] And with those positions, you've then got the ability to assign team members to the position before game.

[8:07] You've got a bunch of different games, and that makes the season.

[8:15] We had some constraints or some goals at least on the position assignments.

[8:22] Uh first constraint is that you're looking for variety.

[8:25] You want the girls to play offense, defense, and goalie.

[8:29] Goalies be trickier because you typically keep a goalie in for the whole quarter, which means you've only got four girls that can rotate through it in a given game.

[8:39] Whereas if you're splitting the halves quarters into halves, you've got eight total assignments for the other positions.

[8:48] And so it's just a little bit trickier to get the girls through goalie.

[8:51] You've got 11 total players.

[8:53] Basically, over the course of three games, you can get all of them through goal.

[8:58] And that works well to give us your goal.

[8:59] Uh most girls want it to be goalie.

[9:07] What else?

[9:08] Uh for the positions that run more, which is typically the midfield, you would ideally like to get those swamped at the half quarter mark.

[9:20] So you'd play mid for seven minutes, and then you'd switch over to something else, or you'd come off the field if you're exhausted.

[9:28] For defense and forward, those typically involve less running.

[9:32] And so you would typically keep a girl in that position for the full 14 minutes, and just let them typically they'd just be okay and not need a break or a rest.

[9:47] Um if I was thinking about how to make this, what would be perfect?

[9:55] Perfect would be you click one button, and you get every set of positions for every game.

[10:05] You print them all, you show up to the game, and you're done.

[10:10] Now that's not actually ideal, even though it sounds nice.

[10:13] Um, way more realistic is what you really need is a schedule for the next game, and you want to be able to click a button about one day before, once you know final availability and who's going to be there or who's not.

[10:28] The worst thing that would happen in the current order is that you would make a schedule, somebody would call in some available.

[10:36] Now you either have to remake the schedule, which is a nuisance, or just sort of sub on the fly for people that are actually at the game so what would be ideal ideal is that you can come in uh day before click a button get a candidate schedule review it if you wanted to make changes you could what are the changes you might make uh you might choose to swap two girls in specific positions you might choose to uh look at who's playing at a given time and say oh that's slightly unbalanced we've got our two better forward and playing together at the same time we really want them to play opposite each other not at the same time that way they've got the ability to help work with some of the other players you might look at that and say adequate constraint these two should not play at the same time during this game so that might be one way to do it the other way you might do it is just to say move this person to here and so you're basically rearranging a handful of lots the other thing you're trying to do during the game is get equal playtime so if you've got 11 total girls and seven times eight minutes of playtime essentially seven positions, eight half quarters.

[12:22] You are then looking at whatever that is, 56 total minutes.

[12:28] That should be more than that.

[12:30] Um I missing here.

[12:35] There's eight half quarters.

[12:38] Ah, and they're seven minutes each.

[12:40] Okay, so multiple by seven, 350-something minutes.

[12:43] Split across 11 girls, then they're all playing.

[12:46] You're in the world of they should all play for about 30 minutes each, which works out to 30 minutes each.

[12:54] Don't even do any more math on that.

[12:57] And so for a given schedule, you just want to make sure that there's not some extreme lopsided mess.

[13:04] We've got one girl playing 20 minutes, another girl playing 50 minutes.

[13:09] Uh you certainly don't want that to be the plan from the start.

[13:14] And very rarely would you have a girl play even an extra half quarter or two.

[13:20] Uh it was all very even while we were playing.

[13:24] Um the ability to quickly create a schedule that's valid is the most important schedule meaning a valid assignment of uh girls two positions for the half quarter slots.

[13:42] Um beyond that, you might want to get some sense of uh how does total play time in various positions fare?

[13:52] So it's one thing to get a nice mix of offense and defense in a single game, but if you have the ability to see total minutes by position by season, uh it'd be good to just keep that balance to the extent possible, with maybe a very slight bias towards uh forward mid sweeper for girls that want to be a little bit more in one area or another or goalie some girls really like goalie um and really the uh schedule making is the most useful and most difficult piece of the current thing it's not like it's uh it's not like it's difficult to make it I mean i I guess it's a it's a little bit of a burden like you have to sit there and arrange all these cells you can open tools that help you but at the end of the day you're manually clicking in Excel to make it work the way you want then I think from there it's like once you've got this common data structure for the assignments in a given game you'd like to be able to just quickly view it differently hey show it's me by position shows me by girl shows me by I guess that's pretty much it um okay what else would be nice you've got the schedule you need to be able to print it I think additionally it'd be really nice if both coaches could log in and see it for a given game because if you can log in and see it especially if it works on a phone now you don't have to worry about printing it off at the game or you could print it off.

### Sharing, viewing, and game-day live mode

Time: 15:32 - 18:55

#### Summary

Covers printing, login access for coaches, phone-friendly viewing, live timer integration, and real-time substitutions during games.

#### Transcript

[13:52] So it's one thing to get a nice mix of offense and defense in a single game, but if you have the ability to see total minutes by position by season, uh it'd be good to just keep that balance to the extent possible, with maybe a very slight bias towards uh forward mid sweeper for girls that want to be a little bit more in one area or another or goalie some girls really like goalie um and really the uh schedule making is the most useful and most difficult piece of the current thing it's not like it's uh it's not like it's difficult to make it I mean i I guess it's a it's a little bit of a burden like you have to sit there and arrange all these cells you can open tools that help you but at the end of the day you're manually clicking in Excel to make it work the way you want then I think from there it's like once you've got this common data structure for the assignments in a given game you'd like to be able to just quickly view it differently hey show it's me by position shows me by girl shows me by I guess that's pretty much it um okay what else would be nice you've got the schedule you need to be able to print it I think additionally it'd be really nice if both coaches could log in and see it for a given game because if you can log in and see it especially if it works on a phone now you don't have to worry about printing it off at the game or you could print it off.

[15:32] Sometimes the girls would like to look at it and sometimes it's nice to just have a printed copy rather than trying to pull out a phone especially if it's raining we have at least one game in the rain and pulling out a phone to look at it was uh pretty terrible.

[15:48] I've granted we were like zooming in on a PD matter than a text message or something.

[15:52] So it's terrible for a lot of reasons, including the rain.

[15:57] But being able to uh at least see it would be nice.

[16:03] Um then I guess to the next part, which is if you're going to have a timer, it might be really nice to incorporate the timer and basically a heads-up view of who's on the field at the moment.

[16:21] Because if you handle those together, then you could just glance at your screen, see who's supposed to be where, see how much time left, understand what the next subs are going to be, and then if you had to make it on the spot sub.

[16:40] Somebody gets injured or needs a break, you can drag somebody off the bench into that position, keep track of the substitutions in some fashion.

[16:52] Keep track of the original schedule as well, because usually the goal is to get it swapped back as soon as possible.

[17:01] Um I guess as I'm talking through it really this whole thing sounds like it should just be an iOS application, because then if you're in game, you could legitimately just have it on the lock screen with the timer.

[17:19] I assume it's possible to do that with a widget or something.

[17:22] Uh that should also make it way easier to pop it open and just see it during the game.

[17:31] But I think if you're doing that, it would still be a lot nicer for creating the schedule to be able to see it at least on a desktop or an iPad or something.

[17:43] Um could probably make it work on an iPhone, but it'd be difficult to see the whole schedule at once.

[17:53] Like if you're reviewing it, you might be reviewing a quarter at a time.

[17:57] And then you just sort of have to trust that the schedule is tracking some total minutes and other stuff.

[18:06] It's like you can eyeball is this quarter roughly going to be correct.

[18:11] Yes, no, that's straightforward.

[18:13] But then trying to keep track of how many total minutes has the girl played in what positions across what sides of the field.

[18:21] That becomes a little bit more of a head scratcher.

[18:28] Okay, so we got this thing.

[18:29] It's uh nice application.

[18:32] And even if it's not a true iOS app, you could definitely do it as a website with a PWA or whatever.

[18:40] That would work.

[18:42] It just feels like uh to accept this thing as any good.

[18:47] Making it be an actual iOS application could actually be quite nice, because then you could easily just have people pay for it.

### Optional tracking: scores, calendars, and matchup notes

Time: 19:04 - 24:15

#### Summary

Mentions secondary features such as scorekeeping, goal times, calendar events, game-day emails, opposing team notes, and related administrative details.

#### Transcript

[19:04] A season, even just one time, to not have to deal with schedules.

[19:10] Maybe there's a way that you just have a single coach pay for it and they can let basically like you buy it for a team, and then two coaches, three coaches, whoever can all manage it separately.

[19:25] Um are there any other features that would be nice?

[19:29] I think it might be good to keep track of score or who scored goals and at what time.

[19:37] Now that's starting to venture into the world of just general scorecard score keeping.

[19:43] I don't think that's exactly the goal here.

[19:46] The goal is really administration, schedule, just keeping track of who's supposed to be where.

[21:00] Minzer playing in the middle essentially.

[21:02] And then if you want to keep track of playtime by field order, the strip of you know this quarter field, you could do that.

[21:12] So if you want to like reconcile different uh player positions, uh different arrangements of the players.

[21:21] Um what else is in there?

[21:27] What else would be nice?

[21:28] Um you're making these schedules, you know what the time is, you know what the location is.

[21:34] You could uh also just have it keep track of the schedule.

[21:41] I know the coach is getting the schedule in there and then sending out Google Calendar invitations, and so if you could make that uh seamless, aimless thing, I may say eight or nine or so clicks.

[21:58] Maybe it's the sort of thing where it just gives you a uh ICS event, some sort of calendar download, and then you can add the two line or whatever.

[22:08] You don't need to make it too crazy here.

[22:10] I assume Coach T Steven has some sort of process that he's using for likes.

[22:20] But you could definitely do more than nothing.

[22:35] What else is there?

[22:36] You've got the girls' names, kind of picture.

[22:40] I guess not really, because they're numbered fine.

[22:44] Um does a scheduling application like this.

[22:53] You'd probably want to have some almost like calendar-based view of it.

[22:58] You might want to know the opposing team you're playing.

[22:59] If you're gonna play the same team again, you can maybe take notes on that team.

[23:07] You don't really want to keep track of all their girls and their positions.

[23:10] But you could at least log a note or two if you want to play them again.

[23:15] Might be nice to see the other coaches' names.

[23:18] Um this is just like info you have, it's not super useful.

[23:25] I'm thinking if you're making this realistically, the main views are you have kind of an admin view and then a just viewer page.

[23:33] In the admin view, you're managing the girls, you're managing the available uh field positions.

[23:41] 222, 1221.

[23:45] You're listing the uh locations, I guess.

[23:50] Riverwood or clearwater.

[23:53] You're listing the game times, which include the location.

[23:58] So we're playing Saturday, October 12th at Riverwood.

[24:02] Game starts at 1.30.

[24:05] We want everybody to be there at 1.15.

[24:08] And so then you could package all that up into a nice calendar invite.

[24:13] That all feels pretty good.

### Data model, seasons, and admin structure

Time: 24:18 - 30:56

#### Summary

Outlines the likely data structure for games, positions, and players, plus season handling, contact info, and the idea of replacing the spreadsheet with a broader admin tool.

#### Transcript

[24:18] You could have the site email a link to the schedule of one day before the game or so.

[24:29] That might be nice just so you have it on hand, you can go quickly verify it uh if you're gonna make changes before you send an email although maybe you just have a link just be correct for the game so anybody who roads it sees the most recent copy probably slightly better than trying to email a copy of the schedule that is likely to change um so then you've got this main view which is if you've got a game that day I'm sure in the iOS not being pressed it's like it's just gonna show you the schedule for the game that day just as soon as you're in game mode um it knows when the game is started so it knows you're close you can keep track of when did the period start that can actually be synchronized across all the devices so one person starts it everybody sees the same timer that may actually be a kind of nice feature other than that you know if you know the timers you know kind of how the game's progressing that means you know who should be on the field at a given time that's by far the most important thing to show when you're in game mode you would then want to be able to see who's going on next you want to be able to zoom out and see the whole schedule both the period that are remaining but also everything just in case um I think that's pretty much the bulk of the schedule viewing and then on the team admin side you might want to keep track of playing time you might want to keep track of known uh not available.

[26:20] You can do that by player.

[26:22] Now this player's not available for this game.

[26:26] What else happened?

[26:28] From time to time, there would be a need to figure out what dates were available to make up a game.

[26:36] And so coach would send out a form, what's the dates?

[26:39] People would reply.

[26:44] In theory, you can move that sort of thing into the app if you wanted.

[26:50] Now you're emailing the parents.

[26:53] Keep track of all that.

[26:55] I don't know if it's really worth doing it there.

[26:59] But that's one thing that did come up.

[27:05] Game might get rescheduled.

[27:08] You might then need to scratch a player.

[27:15] Do we need to keep track of the old schedules?

[27:18] Schedules that were generated but not used.

[27:20] No, I don't think so.

[27:21] I think you just added them in place.

[27:28] Some combination of game ID position player.

[27:44] Then is it better to do it by player or by position?

[27:48] Well, you know that there are seven positions.

[27:54] And so you could do it that way.

[27:57] You just have seven positions.

[27:59] One, two, three, four, five, six, seven.

[28:01] The position has a label.

[28:03] So this is right mid, right forward, goalie.

[28:09] That would probably be fine.

[28:14] If you then have to flip between layout 222, 1221, you still at least have some starting positions that are close.

[28:26] If you roughly map it so that one is offense and seven is goalie.

[28:32] That's probably how you would do it.

[29:02] So then the final three variables just be player in the slot.

[29:09] So you'd be uniquely keyed on the game ID ID position ID player ID.

[29:22] And then you just pre-compute all of those in advance for a game.

[29:31] And that's probably good enough.

[29:34] There's probably other ways of doing it, but it's kind of a pretty fixed base.

[29:45] You just gotta remove them throughout.

[29:48] You change their display name, possibly.

[29:50] You don't really need like historical tracking here.

[29:54] Um all that's feeling pretty straightforward.

[30:05] And then if you wanted to keep track of multiple seasons, you guys could say this is a team.

[30:13] Now we're going to a new season.

[30:16] You might bring across the girls.

[30:19] That might work.

[30:22] It's the kids' soccer league, and so uh girls have adults associated with them.

[30:29] So you might want to keep track of those people with their contact info.

[30:33] Basically just a complete replacement for a spreadsheet.

[30:45] That might work.

[30:47] Not sure there's much need for that.

[30:50] Because you can also just as easily copy all those email addresses and just a different Gmail.

### Field visualization and substitution interaction

Time: 31:15 - 33:32

#### Summary

Describes a possible field view showing players on the pitch and on the sidelines, with swipeable time slots and an explicit substitution view for calling out replacements.

#### Transcript

[31:15] That's really just their problem.

[31:31] Something about a field.

[31:33] You can draw a soccer field, you can draw the goals, you can draw the players.

[31:38] I think that's worthwhile.

[31:40] Basically you have a field view.

[31:44] You put the players on field with their name, numbers.

[31:49] You can just swipe through.

[31:54] And see who's where these have uh some number of names over on the sidelines indicate that they're subs.

[32:02] And then you swap to the next time slot.

[32:06] And maybe the little labels quickly ease or transition from one spot to the next.

[32:22] And so it could emphasize or show who's moving.

[32:28] These subs are going to those spots.

[32:32] That's really the question is where does the sub go?

[32:35] You can see that you can very quickly call out to the field for who's coming off.

[32:39] You could also just have like an actual substitution view where it gives you both of those.

[32:46] You want to be able to yell out there who's coming off.

[32:48] And then you want to be able to look at the subset on the sidelines and tell them exactly what position they're going to and who they're replacing.

[33:03] I think you could reasonably fit it all even on the iPhone screen.

[33:07] Like 11 names arranged.

[33:10] It's not so bad.

[33:15] Um any other views you would want to keep track of.

[33:21] I just don't think so.

[33:26] Alright, that feels like enough for now.

[33:29] For nice workup on the soccer application.