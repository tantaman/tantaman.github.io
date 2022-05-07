---

title: 'Understanding False Positive Rate'
tags: [math, demo]
customjs:
  - /assets/posts/false-positive-rate.js
css:
  - /assets/posts/false-positive-rate.css
image: /assets/posts/understanding-fp-rate.svg
---

[Jump to the simulation](#prior-probability)

Throughout the Coronavirus pandemic, the most distressing thing has been the cherry picking of statistics.

Things have gotten better. Cases, deaths, and hospitalizations are often reported per 100k, rather than being without context. We're also getting information about the percentage of people that test positive out of all the people that were tested.

**But if you test positive for an illness, what is the chance that you really have that illness?**

Speaking with friends and family, the conversation around the chances of having COVID given a positive test generally goes:

<ul class="dialogue">
<li><strong>Me:</strong> <q>What do you think the chances are of having COVID if you test positive for COVID?</q></li>
<li><strong>Friend/Family:</strong> <q>What's the false positive rate of the test?</q></li>
<li><strong>Me:</strong> <q>0.5%</q></li>
<li><strong>F/F:</strong> <q>Then there's a 99.5% chance that you do have COVID.</q></li>
<li><strong>Me:</strong> <q>That's actually not how false positive rate works. You have to account for prevalence of the disease.</q></li>
</ul>

To cut to the chase, you can actually have a false positive rate of 0.5% but still have 50% of positive test results be incorrect! Or even 60, 70, 80, 90 all the way up to 100% incorrect positive results!

**How is that even possible!?**

## Example:

Imagine you have a population of 1,000 people and we know for a fact that only one of them has COVID but we don't know which one. Someone devises a test to try to find the sick person. That test has a 10% false positive rate and 0% false negative rate.

We run that test against all 1,000 people. After testing the entire population we will have 100 people test positive for COVID. 1 person that actually has the disease and 99 (10% of 999) that are false positives.

What the above means is that given a positive test result, you still only have a 1/100 chance of having COVID.

In other words, a false positive rate of 10% under these conditions will still result in 99% of positive tests being incorrect.

## Prior Probability

What is going on is that the prior probability of having a disease impacts the amount of positive test results that are in error. If 100% of the population has the disease then the number of tests in error would match the test's false positive rate. If 0% of the population has the disease then 100% of positive test results are incorrect.

To get a feel for how the different variables impact testing, you can modify the prevalence, false positive and false negative rates below to see the various outcomes.

<table class="demo-controls">
    <tbody>
      <tr>
      <td>
        <label for="pop-ctrl">Population Size (<span id="pop-legend">10,000</span>)</label>
      </td>
      <td>
        <input type="range" id="pop-ctrl" min="1000" max="100000" value="10000" step="1000">
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
      <tr>
        <td>
          <label for="fn-rate-ctrl">False Negative Rate (<span id="fn-rate-legend">25</span>%)</label>
        </td>
        <td>
          <input type="range" id="fn-rate-ctrl" max="100" min="0" value="25" step="1">
        </td>
      </tr>
    </tbody>
  </table>
<div class="full-info-box">
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
      <div class="readout"><span id="infected-value">y</span></div>
      <div class="readout">have COVID</div>
      <div class="vertical-bar"></div>
    </div>
    <div class="not-have right">
      <div class="vertical-bar"></div>
      <div class="clear"></div>
      <div class="readout"><span id="healthy-value">x</span></div>
      <div class="readout">do not have COVID</div>
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
</div>
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
<br/>
## On Case Numbers

All of this sheds a different light on case numbers. Are reported numbers only based on testing, or are they compensating for the number of incorrect test results?

To compensate for incorrect test results, you can calculate test positivity. Test positivity represents the fraction of people tested that had a positive result. If you have high test positivity then you will have many fewer positive results that are incorrect.

### TODO:
* More stuff for me to write:
  * Explain Bayes theorem
  * Interactive plot of positivity vs false positives
  * On editorializing

**References:**<br/>
https://www.icd10monitor.com/false-positives-in-pcr-tests-for-covid-19<br/>
