---
layout: post
title: 'Understanding False Positive Rate'
categories: statistics causes reasoning bayes
customjs:
  - /assets/posts/false-positive-rate.js
css:
  - /assets/posts/false-positive-rate.css
---

Throughout the Coronavirus pandemic, the most distressing thing has been the cherry picking of statistics.

Things have gotten better. Cases, deaths, and hospitalizations are often reported per 100k, rather than being without context. We're also getting information about the percentage of people that test positive out of all the people that were tested.

**But if you test positive for an illness, what is the chance that you really have that illness?**

Speaking with friends and family, the conversation around the chances of having COVID given a positive test generally goes:

<ul class="dialogue">
<li><strong>Me:</strong> <q>What do you think the chances are of having COVID if you test positive for COVID?</q></li>
<li><strong>Friend/Family:</strong> <q>Do you know the false positive rate of the test?</q></li>
<li><strong>Me:</strong> <q>0.5%</q></li>
<li><strong>F/F:</strong> <q>Then there's a 99.5% chance that you do have COVID.</q></li>
<li><strong>Me:</strong> <q>That's actually not how false positive rate works. You have to account for prevalence of the disease.</q></li>
</ul>

To cut to the chase, you can actually have a false positive rate of 0.5% but still have 50% of positive test results be incorrect! Or even 60, 70, 80, 90 all the way up to 100% incorrect positive results!

**How is that even possible!?**

## Example:

Imagine you have a population of 1000 people and we know for a fact that only one of them has COVID but we don't know which one. Someone devises a test to try to find the sick person. That test has a 10% false positive rate and 0% false negative rate.

We run that test against all 1000 people. After testing the entire population we will have 100 people test positive for COVID.

1 person that actually has the disease and 99 (10% of 999) that are false positives. What this means is that given a positive test result, you still only have a 1/100 chance of having COVID.

In other words, a false positive rate of 10% under these conditions will still result in 99% of positive tests being incorrect.

## Prior Probability

What is going on is that the prior probability of having a disease impacts the amount of positive test results that are in error. If 100% of the population has the disease then the chance of having the disease given a positive test would match the test's false positive rate. If 0% of the population has the disease then 100% of positive test results are incorrect.

Below you can modify the prevalence of the disease (prior probability), false positive rate of the test and population size to see the various outcomes.

One thing that becomes very obvious when playing with the demo below is how important it is for a false positive rate to be as close to 0 as possible. Getting above 1% quickly results in unreliable outcomes.

<div class="full-info-box">
  <form class="demo-controls">
    <table class="right">
      <tbody>
        <tr>
        <td>
          <label for="pop-ctrl">Population Size (<span id="pop-legend">1,000</span>)</label>
        </td>
        <td>
          <input type="range" id="pop-ctrl" min="100" max="5000" value="1000" step="100">
        </td>
        </tr>
        <tr>
          <td>
            <label for="prevalence-ctrl">Prevalence (<span id="prevalence-legend">1</span>%)</label>
          </td>
          <td>
            <input type="range" id="prevalence-ctrl" min="0" max="100" value="1">
          </td>
        </tr>
        <tr>
          <td>
            <label for="fp-rate-ctrl">False Positive Rate (<span id="fp-rate-legend">0.5</span>%)</label>
          </td>
          <td>
            <input type="range" id="fp-rate-ctrl" max="100" min="0" value="0.5" step="0.5">
          </td>
        </tr>
      </tbody>
    </table>
    <div class="clear"></div>
  </form>
  <center class="pop-readout">
    <span>
      <span class="pop-num" id="pop-value">
      1,000
      </span>
      <span class="person">
        <div class="head"></div>
        <div class="body"></div>
        <div class="left-arm-divider"></div>
        <div class="right-arm-divider"></div>
      </span>
    </span>
  </center>
  <center class="top-bar">
    <div class="vertical-bar"></div>
  </center>
  <div class="have-not-have">
    <div class="prevalence left">
      <div class="vertical-bar"></div>
      <div class="readout"><span id="prevalence-value">1</span>% Prevalence</div>
      <div class="vertical-bar"></div>
      <div class="readout"><span id="infected-value"></span> have COVID</div>
      <div class="vertical-bar"></div>
    </div>
    <div class="not-have right">
      <div class="vertical-bar"></div>
      <div class="clear"></div>
      <div class="vertical-bar"></div>
      <div class="clear"></div>
      <div class="readout"><span id="healthy-value"></span> do not have COVID</div>
      <div class="vertical-bar"></div>
      <div class="clear"></div>
      <div class="vertical-bar"></div>
      <div class="clear"></div>
    </div>
    <div class="clear"></div>
  </div>
  <div class="pos-neg">
    <div class="infected-tree">
      <div class="left">
        <div class="vertical-bar"></div>
        <div class="readout"><span id="false-neg-value"></span></div>
        <div class="readout">tested -</div>
      </div>
      <div class="right">
        <div class="vertical-bar"></div>
        <div class="clear"></div>
        <div class="readout"><span id="true-pos-value"></span></div>
        <div class="readout">tested +</div>
        <div class="clear"></div>
      </div>
      <div class="clear"></div>
    </div>
    <div class="healthy-tree">
      <div class="left">
        <div class="vertical-bar"></div>
        <div class="readout"><span id="true-neg-value"></span></div>
        <div class="readout">tested -</div>
      </div>
      <div class="right">
        <div class="vertical-bar"></div>
        <div class="clear"></div>
        <div class="readout"><span id="false-pos-value"></span></div>
        <div class="readout">tested +</div>
        <div class="clear"></div>
      </div>
    </div>
  </div>
  <!-- <table class="outcomes-block">
    <tbody>
      <tr>
        <td id="false-neg-ppl"></td>
        <td id="true-pos-ppl"></td>
        <td id="true-neg-ppl"></td>
        <td id="false-pos-ppl"></td>
      </tr>
    </tbody>
  </table> -->
  <table class="final-stats">
      <tbody>
        <tr>
          <td>Negative results that are wrong </td>
          <td><span id="negative-wrong-value"></span>%</td>
        </tr>
        <tr>
          <td>Positive results that are wrong </td>
          <td><span id="positive-wrong-value">y</span>%</td>
        </tr>
      </tbody>
    </table>
</div>


**References:**<br/>
https://www.icd10monitor.com/false-positives-in-pcr-tests-for-covid-19<br/>
The Science of Why

Follow ups:
- Prevalence here is really "prior probability"
- We were denied tests due to unknown prior probability and capacity for blanket testing to incur a false pandemic
- Case number reporting
  - Still no good (due to unk prevalence)
  - We should have % positive of population tested
    - removes false positive rate concerns
    - but of course the population tested is self-selecting and has a higher prior probability of infection
    - So what's the actual prevalence among the population at large?
- Deaths... deaths and hospitalizations w/ covid we can be more confident about due to
  higher prior probability of having covid
