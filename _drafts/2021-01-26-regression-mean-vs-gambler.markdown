---
layout: post
title: "Regression to the Mean & the Gambler's Fallacy - Simulated"
categories: statistics paradoxical
customjs:
  - /assets/posts/regression-mean-vs-gambler.js
css:
  - /assets/posts/regression-mean-vs-gambler.css
---

[Jump to the simulation](#simulating-both-principles)

There are two seemingly contradictory findings in statistics which apply to independent events:

1. Regression to the Mean
2. The Gambler's Fallacy

**Regression to the mean** is defined as:

> The phenomenon that arises if a sample point of a random variable is extreme (nearly an outlier), a future point will be closer to the mean or average on further measurements. - [Wikipedia](https://en.wikipedia.org/wiki/Regression_toward_the_mean#:~:text=In%20statistics%2C%20regression%20toward%20the,or%20average%20on%20further%20measurements.)

**Example:** If 4 coin tosses produced 4 heads, the next 4 coin tosses are more likely to produce 2 heads and 2 tails.

Whereas the **Gambler's Fallacy** is defined as:

> The erroneous belief that if a particular event occurs more frequently than normal during the past it is less likely to happen in the future. - [Wikipedia](https://en.wikipedia.org/wiki/Gambler%27s_fallacy)

**Example:** If you toss a coin 4 times and each toss is heads, the next toss is neither more nor less likely to be tails.

These two principles seem to be contradictory.

In the first, we hear that after observing an outlier, the variable is more likley be closer to it's mean on the next observation.

In the second, we hear that the past doesn't influence the future for independent events like coin tosses or dice rolls.

# Prior Work

Googling "Regression to the Mean vs Gambler's Fallacy" brings up a number of times where people have sought to remedy this confusion for themselves:

* [stats.stackexchange - Regression to the mean vs gambler's fallacy](https://stats.stackexchange.com/questions/204397/regression-to-the-mean-vs-gamblers-fallacy)
* [math.stackexchange - Regression towards the mean v/s the Gambler's fallacy](https://math.stackexchange.com/questions/433492/regression-towards-the-mean-v-s-the-gamblers-fallacy)
* [quora - What's the difference between regression to the mean and the gambler's fallacy?](https://www.quora.com/Whats-the-difference-between-regression-to-the-mean-and-the-gamblers-fallacy)
* [r/askscience - Do the Gamblers Fallacy and regression toward the mean contradict each other?](https://www.reddit.com/r/askscience/comments/340ulx/do_the_gamblers_fallacy_and_regression_toward_the/)
* [financial wisdom - Coin Tossing ... and Reversion to the Mean](https://www.financialwisdomforum.org/gummy-stuff/coin-tossing.htm)
* [medium - Gambler’s fallacy & Regression towards the means](https://medium.com/@sundaykuloksun/gamblers-fallacy-regression-towards-the-means-ae538ace8318)

I find the [medium article]([medium](https://medium.com/@sundaykuloksun/gamblers-fallacy-regression-towards-the-means-ae538ace8318)) by Ku Lok Sun the most succint and accessible explination of the difference between the two, but none of the sources above provide a simulation of the phenomenon.

# Simulating both principles

To get a practical sense that the principles are in fact not contradictory, lets perform a test.

First we'll flip <i data-bind="num_coins"></i> coins and plot the results.

<span class="coin side-H"></span> will repersent heads.<br/>
<span class="coin side-T"></span> will represent tails.

<div class="coin-chart" data-bind="coin_chart"></div>

Now lets take a look at streaks of <i data-bind="run_length"></i> or more heads in a row as well as streaks of <i data-bind="run_length"></i> or more tails in a row.

Heads streaks ><i data-bind="run_length"></i> are highlighted as <span class="coin side-H run"></span><br/>Tails streaks ><i data-bind="run_length"></i> are highlighted as <span class="coin side-T run"></span>

<div class="coin-chart" data-bind="run_chart"></div>

To explore regression to the mean and the gambler's fallacy, we're interested in knowing what happens immediately after a streak of <i data-bind="run_length"></i>. So lets pull out:

1. Streaks of <i data-bind="run_length"></i>
   1. Streaks greater than <i data-bind="run_length"></i> will be split into (streak length) / <i data-bind="run_length"></i> parts.
2. The coin flip immediately after the streak
3. The set of <i data-bind="run_length"></i> flips immediately after the streak of <i data-bind="run_length"></i>.

We're interested in (2) so we can verify that the chances of heads/tails after a streak is still 50/50 (gambler's fallacy).

We're interseted in (3) so we can verify that a series of flips immediately after an outlier (the streak) is, on average, closer to the mean (regression to the mean).

<table class="run-list">
  <thead>
    <tr>
      <td>Streak</td>
      <td>Next Flip</td>
      <td><i data-bind="run_length"></i> Flips After</td>
      <td><i data-bind="run_length"></i> Flips Sum</td>
    </tr>
  </thead>
  <tbody data-bind="run_list">
  </tbody>
  <tfoot>
    <tr>
      <td><i data-bind="num_runs"></i> Streaks</td>
      <td>
        <i data-bind="after_run_heads"></i> <span class="coin side-H"></span> /
        <i data-bind="after_run_tails"></i> <span class="coin side-T"></span>
      </td>
      <td>
        <i data-bind="seq_after_run_heads"></i> <span class="coin side-H"></span> /
        <i data-bind="seq_after_run_tails"></i> <span class="coin side-T"></span>
      </td>
      <td>
        <i data-bind="num_seq_closer_to_mean"></i> Closer to mean
      </td>
    </tr>
  </tfoot>
</table>
