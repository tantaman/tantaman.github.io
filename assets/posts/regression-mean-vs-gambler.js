const NUM_COINS = 1000;

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
        sid,
        run: sum_back(coin, accumulator),
      });
      return accumulator;
    },
    [],
  ).reverse();
}

function render_coins(coins) {
  return coins.map(
    coin => `<span class="side-${coin.side}" />`
  ).join('');
  // const ret = [];
  // for (let i = 0; i < coins.length; ++i) {
  //   const entry = coins[i];
  //   if (entry.run >= 4) {
  //     ret.push()
  //   }
  // }
}

console.log(find_runs(generate_coins(NUM_COINS)));

const run_chart = document.getElementById('run-chart');
