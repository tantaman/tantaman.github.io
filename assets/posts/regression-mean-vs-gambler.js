const NUM_COINS = 1000;
const RUN_LENGTH = 4;

function last(a) {
  return a[a.length - 1];
}

function flip_coin() {
  return Math.random() * 2 > 1 ? 'H' : 'T';
}

function generate_coins(num_coins) {
   return Array(num_coins).fill(0).map(_ => flip_coin());
}

function sum_back(val, arr, lift) {
  const prev = last(arr);
  if (prev == null || prev.side !== val) {
    return 1;
  }

  return prev.run + 1;
}

function find_runs(coins) {
  return coins.reduceRight(
    (accumulator, coin) => {
      accumulator.push({
        side: coin,
        run: sum_back(coin, accumulator),
      });
      return accumulator;
    },
    [],
  ).reverse();
}

function render_runs(coins) {
  const ret = [];
  for (let i = 0; i < coins.length;) {
    const coin = coins[i];
    if (coin.run >= RUN_LENGTH) {
      render_run(
        coin.run,
        coins,
        i,
        ret,
      );
      i += coin.run;
    } else {
      ret.push(`<span class="side-${coin.side} coin"></span>`);
      ++i;
    }
  }

  return ret.join('');
}

function render_run(run, coins, offset, ret) {
  for (let i = offset; i < offset + run; ++i) {
    const coin = coins[i];
    ret.push(`<span class="side-${coin.side} coin run"></span>`);
  }
}

function extract_runs(coins) {
  const ret = [];
  for (let i = 0; i < coins.length;) {
    if (coins.run < RUN_LENGTH) {
      ++i;
      continue;
    }

    ret.push();
  }
}

function bindit(exported_data) {
  const to_bind = document.querySelectorAll('[data-bind]');
  for (e of to_bind) {
    const x = e.dataset.bind;
    e.innerHTML = exported_data[x];
  }
}

const coins = find_runs(generate_coins(NUM_COINS));

const exported_data = {
  num_coins: NUM_COINS.toLocaleString(),
  coin_chart: coins.map(
    coin => `<span class="side-${coin.side} coin"></span>`
  ).join(''),
  run_chart: render_runs(coins),
  run_length: RUN_LENGTH,
};
bindit(exported_data);
