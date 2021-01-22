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




<div class="full-info-box">
  <center class="pop-readout">
    <span>
      <span class="pop-num">
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
  <center>
    <div class="vertical-bar"></div>
  </center>
  <div>
    <span class="person">
      <div class="head"></div>
      <div class="body"></div>
      <div class="left-arm-divider"></div>
      <div class="right-arm-divider"></div>
    </span>
  </div>
</div>


sources:

https://www.fda.gov/medical-devices/letters-health-care-providers/potential-false-positive-results-antigen-tests-rapid-detection-sars-cov-2-letter-clinical-laboratory

FPR explained:
https://www.icd10monitor.com/false-positives-in-pcr-tests-for-covid-19

The Science of Why

Notes:
- Prevalence here is really "prior probability"
- We were denied tests due to unknown prior probability and capacity for blanket testing to incur a false pandemic
- Case numbers
  - Still no good
  - We should have % positive of population tested
    - removes false positive rate concerns
    - but of course the population tested is self-selecting and has a higher prior probability of infection
    - So what's the actual prevalence among the population at large?
- Deaths... deaths and hospitalizations w/ covid we can be more confident about due to
  higher prior probability of having covid
