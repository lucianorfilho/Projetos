// Base de conhecimento de cenários de conversação.
// Cada tópico tem perguntas em 3 faixas de profundidade:
//   basic (A1-A2), inter (B1-B2), adv (C1-C2).
// O motor de diálogo escolhe a faixa conforme o nível detectado do aluno.

const TOPICS = [
  {
    id: 'introductions',
    keywords: ['name', 'live', 'from', 'city', 'old', 'years', 'job', 'work', 'family', 'brazil'],
    starter: {
      basic: "Hi! I'm Alex, nice to meet you! What's your name, and where are you from?",
      inter: "Hey there! I'm Alex. Great to meet you! Tell me a bit about yourself — what do you do, and what part of Brazil are you from?",
      adv: "Hi, I'm Alex — really glad we're chatting. Before we dive in, paint me a picture of who you are: what fills your days, and what brought you to English?",
    },
    followups: {
      basic: [
        'Nice! And what do you do? Do you work or study?',
        'Do you have a big family?',
        'What do you like to do in your free time?',
        'Do you like your city? Why?',
      ],
      inter: [
        "That's interesting! How did you end up doing that?",
        "What's the best thing about where you live? And the worst?",
        'If you could change one thing about your routine, what would it be?',
        'What made you decide to improve your English?',
      ],
      adv: [
        'How would you say your hometown shaped who you are today?',
        "If you hadn't followed this career path, what do you think you'd be doing instead?",
        'What does a truly good day look like for you, from start to finish?',
      ],
    },
  },
  {
    id: 'food',
    keywords: ['food', 'eat', 'cook', 'restaurant', 'dinner', 'lunch', 'breakfast', 'pizza', 'meat', 'rice', 'delicious', 'hungry', 'coffee'],
    starter: {
      basic: "Let's talk about food! What's your favorite food?",
      inter: "I'm getting hungry just thinking about this — what's the best meal you've had recently?",
      adv: "Food says so much about culture. If you had to introduce Brazilian cuisine to a foreigner with a single dish, what would you pick and why?",
    },
    followups: {
      basic: [
        'Yum! Do you cook at home or eat in restaurants?',
        'What do you usually have for breakfast?',
        'Do you like food from other countries? Which one?',
      ],
      inter: [
        "Who's the best cook in your family? What's their specialty?",
        'Is there any food you refused to eat as a kid but love now?',
        'If you opened a restaurant, what kind of food would you serve?',
      ],
      adv: [
        'Do you think traditional cooking is being lost to convenience food? How do you see that where you live?',
        "What's the most memorable meal of your life — not just the food, but the whole moment?",
      ],
    },
  },
  {
    id: 'travel',
    keywords: ['travel', 'trip', 'beach', 'vacation', 'visit', 'country', 'airport', 'hotel', 'flight', 'tourist'],
    starter: {
      basic: 'Do you like to travel? What place do you want to visit?',
      inter: "Let's talk travel! What's the best trip you've ever taken?",
      adv: "They say travel changes you. What journey — literal or otherwise — has changed the way you see the world?",
    },
    followups: {
      basic: [
        'Nice! Do you prefer the beach or the mountains?',
        'How do you like to travel — by car, bus, or plane?',
        'What city in Brazil do you recommend?',
      ],
      inter: [
        'What went wrong on a trip that you can laugh about now?',
        'Would you rather have one long vacation or several short ones? Why?',
        "What's on your travel bucket list right now?",
      ],
      adv: [
        'Do you think tourism helps or harms the places we visit? Where do you draw the line?',
        'If you had to live abroad for a year, where would you go and how would you adapt?',
      ],
    },
  },
  {
    id: 'work',
    keywords: ['job', 'work', 'office', 'boss', 'company', 'meeting', 'salary', 'career', 'business', 'project', 'client'],
    starter: {
      basic: 'Tell me about your work! What do you do?',
      inter: "What does a typical workday look like for you? Walk me through it.",
      adv: "Work occupies a third of our lives. Does yours feel like a job, a career, or a calling — and what's the difference for you?",
    },
    followups: {
      basic: [
        'Do you like your job? Why?',
        'What time do you start work? Is it far from your house?',
        'What job did you want when you were a child?',
      ],
      inter: [
        "What's the most challenging part of your job?",
        'If money were no problem, would you keep working? Doing what?',
        'How has your field changed in the last few years?',
      ],
      adv: [
        'How do you think AI will reshape your profession over the next decade?',
        "What's one piece of career advice you'd give your younger self?",
      ],
    },
  },
  {
    id: 'hobbies',
    keywords: ['hobby', 'free time', 'music', 'movie', 'series', 'game', 'sport', 'gym', 'soccer', 'football', 'read', 'book', 'play', 'watch'],
    starter: {
      basic: 'What do you like to do in your free time?',
      inter: "Life can't be all work! What have you been into lately — shows, sports, music?",
      adv: 'What activity makes you completely lose track of time, and what do you think that says about you?',
    },
    followups: {
      basic: [
        'Cool! How often do you do that?',
        'What music do you like? Who is your favorite singer?',
        'Do you play any sports?',
      ],
      inter: [
        'What show or movie have you recommended the most to friends? Sell it to me!',
        'Is there a hobby you dropped that you wish you could pick up again?',
        "What's something new you'd love to learn this year?",
      ],
      adv: [
        'Do you think hobbies should stay hobbies, or is turning passion into profit worth the risk?',
        'What book, film, or album genuinely changed your perspective on something?',
      ],
    },
  },
  {
    id: 'future',
    keywords: ['future', 'plan', 'dream', 'goal', 'next year', 'hope', 'wish', 'someday', 'retire'],
    starter: {
      basic: 'What are your plans for the future?',
      inter: 'Where do you see yourself in five years — honestly, not the job-interview answer!',
      adv: "If you fast-forward twenty years, what would 'a life well lived' look like for you?",
    },
    followups: {
      basic: [
        'What is your big dream?',
        'Do you want to visit another country someday?',
        'What do you want to learn next year?',
      ],
      inter: [
        "What's one goal you're actively working on right now?",
        'What would you do if you knew you could not fail?',
      ],
      adv: [
        'How do you balance planning for the future with living in the present?',
        'What legacy — big or small — would you like to leave?',
      ],
    },
  },
  {
    id: 'technology',
    keywords: ['technology', 'phone', 'computer', 'internet', 'app', 'ai', 'artificial', 'social media', 'instagram', 'whatsapp', 'software'],
    starter: {
      basic: 'Do you use your phone a lot? What apps do you use every day?',
      inter: 'Technology moves fast! What piece of tech could you absolutely not live without?',
      adv: 'AI is everywhere now. Where do you stand: cautious optimist, enthusiast, or skeptic — and why?',
    },
    followups: {
      basic: [
        'Do you like social media? Which one?',
        'Do you watch videos on YouTube? About what?',
      ],
      inter: [
        'Do you think people spend too much time on their phones? Are you guilty of it too?',
        'What app would you invent if you could?',
      ],
      adv: [
        'Should children have smartphones? At what age, and with what limits?',
        'Is technology making us more connected or more isolated? Defend your view!',
      ],
    },
  },
];

// Reações genéricas para dar naturalidade à conversa (por faixa)
const REACTIONS = {
  basic: ['Nice!', 'Oh, cool!', 'Really? Great!', 'That sounds good!', 'Interesting!'],
  inter: ["That's really interesting!", 'Oh, I love that!', 'No way, that sounds great!', 'I can totally relate to that.', 'Good point!'],
  adv: ["That's a fascinating way to put it.", 'I hadn’t thought of it like that — fair point.', 'That resonates with me.', 'Well said!'],
};

// Elogios quando o aluno escreve sem erros
const PRAISE = {
  basic: 'By the way, your sentence was perfect! 🎉',
  inter: 'Nice work — that was grammatically spot on!',
  adv: 'Flawless phrasing, by the way.',
};

module.exports = { TOPICS, REACTIONS, PRAISE };
