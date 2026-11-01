// Out-of-distribution challenge set: everyday phrases the generator never produced. [message, previous act, wanted act]
export const OOD = [
  ["you know what", "", "want_to_talk"], ["guess what", "", "want_to_talk"], ["you know what?", "greet", "want_to_talk"], ["listen", "", "want_to_talk"], ["so there's something i wanted to tell you", "", "want_to_talk"], ["can i ask you something", "", "want_to_talk"],
  ["hey", "", "greet"], ["hey!", "", "greet"], ["hey there", "", "greet"], ["hello hello", "", "greet"], ["good morning pip", "", "greet"],
  ["oh", "", "other"], ["anyway", "", "other"], ["hmm", "", "other"], ["right", "", "other"], ["well", "", "other"],
  ["what's the capital of japan", "", "other"], ["who won the world cup", "", "other"], ["set a timer for ten minutes", "", "other"], ["how do i boil an egg", "", "other"],
  ["it's raining here", "", "share"], ["i'm eating noodles", "", "share"], ["my cat just knocked over my cup", "", "share"],
  ["are you real", "", "who_help"], ["who made you", "", "who_help"], ["can i trust you with this", "", "who_help"],
  ["i keep putting this off", "", "task_say"], ["i can't get started on my report", "", "unclear"], ["i have a presentation tomorrow and i'm freaking out", "", "deadline"],
  ["i'm exhausted", "", "tired"], ["i can't stop looking at my phone", "", "distract"], ["too many things to do", "", "overwhelm"],
  ["thank you so much", "", "thanks"], ["ok bye", "", "bye"], ["yep", "", "yes"], ["nah", "", "no"],
  ["tell me something funny", "", "joke"], ["i did it!", "", "win"], ["plan my week please", "", "ask_plan"], ["i need a break", "", "ask_break"],
  ["i need to vent about my boss", "", "want_to_talk"], ["my roommate is being impossible", "", "vent"], ["i feel kind of empty today", "", "low"],
];
