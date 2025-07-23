\version "2.24.0"

\header {
  title = "The Mirror Room Suite"
  subtitle = "I. The Consistent Man"
  composer = "Composed for The Mirror Room Collection"
  tagline = \markup { "Andante sostenuto → Allegro con fuoco" }
}

% Define the main themes
fragmentedTheme = {
  c8 es f g~ g4 r8 f8 |
  g4 r4 r8 bes c4 |
  r2 r4 r4 |
  r1 |
}

disciplineTheme = {
  c4 d e f |
  g f e d |
  c d e g |
  c1 |
}

\score {
  \new PianoStaff <<
    \new Staff = "right" \with {
      midiInstrument = "acoustic grand"
    } {
      \clef treble
      \key c \minor
      \time 4/4
      
      % Opening - The Fragmented Self (measures 1-16)
      \tempo "Andante sostenuto" 4 = 60
      \fragmentedTheme\pp
      
      % Repeat with variations
      c8 es f g~ g4 r8 f8 |
      g4 bes4 r8 c4. |
      r4 es8 f g4 r4 |
      r1 |
      
      % More fragmented attempts
      c8 es r4 f8 g r4 |
      r8 bes c4 r2 |
      es8 f g4 r2 |
      r1 |
      
      % Building uncertainty
      c8 es f g bes c r4 |
      r8 f, g bes c4 r4 |
      es8 f g4 r8 bes c4 |
      r1 |
      
      % The Decision Point (measures 17-20)
      \tempo "Poco meno mosso" 4 = 50
      <c e g>1\ff |
      r1 |
      r1 |
      r1 |
      
      % The Discipline Theme begins (measures 21-48)
      \tempo "Moderato" 4 = 88
      \key c \major
      \disciplineTheme\p
      
      % Develop the discipline theme
      d4 e f g |
      a g f e |
      d e f a |
      d1 |
      
      % Transpose up
      e4 fis g a |
      b a g fis |
      e fis g b |
      e1 |
      
      % Back to original key, stronger
      c4 d e f |
      g f e d |
      c d e g |
      c1 |
      
      % Octave displacement for development
      c'4 d, e' f, |
      g' f, e' d, |
      c' d, e' g, |
      c'1 |
      
      % Testing phase with minor episodes
      \key c \minor
      c4 d es f |
      g f es d |
      c d es g |
      c1 |
      
      % Back to major, more confident
      \key c \major
      c4 d e f |
      g f e d |
      c d e g |
      c1 |
      
      % Building to climax
      <c e>4 <d f> <e g> <f a> |
      <g b> <f a> <e g> <d f> |
      <c e> <d f> <e g> <g b> |
      <c e g>1 |
      
      % Climax - both hands in octaves (measures 85-96)
      c4 d e f |
      g f e d |
      c d e g |
      c1 |
      
      % Octave higher
      c'4 d' e' f' |
      g' f' e' d' |
      c' d' e' g' |
      c''1 |
      
      % Descending back
      c'4 d' e' f' |
      g' f' e' d' |
      c' g e c |
      <c e g c'>1 |
      
      % Coda - quiet confidence (measures 97-112)
      \tempo "Andante tranquillo" 4 = 72
      c4 d e f |
      g f e d |
      c d e g |
      c1 |
      
      % Softer
      c4 d e f |
      g f e d |
      c d e g |
      c1 |
      
      % Final statement
      c4 d e f |
      g f e d |
      c d e g |
      <c e g c'>1\fermata |
    }
    
    \new Staff = "left" \with {
      midiInstrument = "acoustic grand"
    } {
      \clef bass
      \key c \minor
      \time 4/4
      
      % Opening - broken octaves, unstable (measures 1-16)
      c,8 c r4 r8 g, g r |
      r4 r8 f, f r r4 |
      es,8 es r2. |
      r1 |
      
      % Variations
      c,8 c r4 g,8 g r4 |
      f,8 f r4 r2 |
      es,8 es r4 c,8 c r4 |
      r1 |
      
      % More broken patterns
      c,4 r8 c r4 g,8 g |
      r4 f,8 f r2 |
      es,4 r8 es, c,4 r4 |
      r1 |
      
      % Building
      c,8 c g,4 f,8 f es,4 |
      c,8 c r4 g,8 g r4 |
      f,4 es,4 c,2 |
      r1 |
      
      % The Decision Point
      <c, e, g,>1 |
      r1 |
      r1 |
      r1 |
      
      % Discipline theme - solid bass (measures 21-48)
      \key c \major
      c,4 g,4 c,4 g,4 |
      c,4 g,4 c,4 g,4 |
      f,4 c,4 f,4 c,4 |
      c,1 |
      
      % Continue solid pattern
      g,4 d4 g,4 d4 |
      g,4 d4 g,4 d4 |
      c4 g,4 c4 g,4 |
      g,1 |
      
      % Transpose up
      a,4 e4 a,4 e4 |
      a,4 e4 a,4 e4 |
      d4 a,4 d4 a,4 |
      a,1 |
      
      % Back to C, stronger
      c,4 g,4 c,4 g,4 |
      c,4 g,4 c,4 g,4 |
      f,4 c,4 f,4 c,4 |
      c,1 |
      
      % Development
      c,4 g,4 c4 g,4 |
      c4 g,4 c4 g,4 |
      f,4 c4 f,4 c4 |
      c,1 |
      
      % Minor episode
      \key c \minor
      c,4 g,4 c,4 g,4 |
      c,4 g,4 c,4 g,4 |
      f,4 c,4 f,4 c,4 |
      c,1 |
      
      % Back to major
      \key c \major
      c,4 g,4 c,4 g,4 |
      c,4 g,4 c,4 g,4 |
      f,4 c,4 f,4 c,4 |
      c,1 |
      
      % Building to climax
      c,4 g,4 c,4 g,4 |
      c,4 g,4 c,4 g,4 |
      f,4 c,4 f,4 c,4 |
      c,1 |
      
      % Climax - octaves with right hand
      <c, c>4 <g, g>4 <c, c>4 <g, g>4 |
      <c, c>4 <g, g>4 <c, c>4 <g, g>4 |
      <f, f>4 <c, c>4 <f, f>4 <c, c>4 |
      <c, c>1 |
      
      % Continue climax
      <c, c>4 <g, g>4 <c, c>4 <g, g>4 |
      <c, c>4 <g, g>4 <c, c>4 <g, g>4 |
      <f, f>4 <c, c>4 <f, f>4 <c, c>4 |
      <c, c>1 |
      
      % Descending
      <c, c>4 <g, g>4 <c, c>4 <g, g>4 |
      <c, c>4 <g, g>4 <c, c>4 <g, g>4 |
      c,4 g,4 c,4 g,4 |
      <c, c>1 |
      
      % Coda - quiet confidence
      c,4 g,4 c,4 g,4 |
      c,4 g,4 c,4 g,4 |
      f,4 c,4 f,4 c,4 |
      c,1 |
      
      % Softer
      c,4 g,4 c,4 g,4 |
      c,4 g,4 c,4 g,4 |
      f,4 c,4 f,4 c,4 |
      c,1 |
      
      % Final
      c,4 g,4 c,4 g,4 |
      c,4 g,4 c,4 g,4 |
      f,4 c,4 f,4 c,4 |
      <c, c>1\fermata |
    }
  >>
  
  \layout {
    \context {
      \PianoStaff
      \override DynamicText.direction = #UP
    }
  }
  
  \midi {
    \tempo 4 = 60
  }
}