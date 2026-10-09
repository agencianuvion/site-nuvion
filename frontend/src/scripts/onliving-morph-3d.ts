// OnLiving ⇄ Nuvion particle-morph hero, adapted from the standalone design reference
// (onliving-morph-nuvion-3d.html) the same way wegg-morph-3d.ts adapted the WEGG one: sized to its own
// container (not the viewport), pointer rotation read across the whole page (not just the canvas), click-to-
// toggle scoped to the canvas only, particle count/point size tuned down on small screens, idle camera sway
// skipped under prefers-reduced-motion, and the render loop paused via IntersectionObserver while off-screen.
// Used only by src/pages/parceiros/onliving.astro — isolated from the rest of the site, same as the WEGG page.
import * as THREE from "three";

const CFG = {
  hold: 2.0,
  morphDuration: 2.4,
  swirl: 0.9,
  shedRatio: 0.12,
  shedAmount: 1.0,
  springMin: 60,
  springMax: 160,
  springDamping: 6.5,
  wobbleMax: 0.045,
  airDrag: 1.3,
  buoyancy: 0.18,
  worldWidth: 9,
  maxRotY: 0.65,
  maxRotX: 0.45,
  rotSmooth: 0.04,
  shedOmega: 0.9,
};
const COL = {
  white: new THREE.Color("#f4f7ff"),
  blue: new THREE.Color("#a3c6ff"),
  yellow: new THREE.Color("#ffc21a"),
  yellowLight: new THREE.Color("#ffe48a"),
  orange: new THREE.Color("#e84a18"),
};

const gauss = () => {
  let u = 0,
    v = 0;
  while (!u) u = Math.random();
  while (!v) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};
const shellR = () => (Math.random() < 0.8 ? 0.88 + Math.random() * 0.12 : Math.sqrt(Math.random()) * 0.88);

const LOGO_SRC =
  "data:image/png;base64,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vLDwG/eE8/s3BCkeAAAACXBIWXMAAC4jAAAuIwF4pT92AAADamlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSfvu78nIGlkPSdXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQnPz4NCjx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iPjxyZGY6UkRGIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyI+PHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9InV1aWQ6ZmFmNWJkZDUtYmEzZC0xMWRhLWFkMzEtZDMzZDc1MTgyZjFiIiB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iPjxkYzpjcmVhdG9yPjxyZGY6U2VxIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyI+PHJkZjpsaT5KdWFuIENhcmxvPC9yZGY6bGk+PC9yZGY6U2VxPg0KCQkJPC9kYzpjcmVhdG9yPjwvcmRmOkRlc2NyaXB0aW9uPjxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PSJ1dWlkOmZhZjViZGQ1LWJhM2QtMTFkYS1hZDMxLWQzM2Q3NTE4MmYxYiIgeG1sbnM6ZXhpZj0iaHR0cDovL25zLmFkb2JlLmNvbS9leGlmLzEuMC8iPjxleGlmOkRhdGVUaW1lT3JpZ2luYWw+MjAyNi0wOS0xOFQxNzoxNDoyNS4xMTg8L2V4aWY6RGF0ZVRpbWVPcmlnaW5hbD48L3JkZjpEZXNjcmlwdGlvbj48cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0idXVpZDpmYWY1YmRkNS1iYTNkLTExZGEtYWQzMS1kMzNkNzUxODJmMWIiIHhtbG5zOnhtcD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wLyI+PHhtcDpDcmVhdGVEYXRlPjIwMjYtMDktMThUMTc6MTQ6MjUuMTE4PC94bXA6Q3JlYXRlRGF0ZT48L3JkZjpEZXNjcmlwdGlvbj48L3JkZjpSREY+PC94OnhtcG1ldGE+DQo8P3hwYWNrZXQgZW5kPSd3Jz8+5R1lPwAAACF0RVh0Q3JlYXRpb24gVGltZQAyMDI2OjA5OjE4IDE3OjE0OjI1mhHARwAAKuVJREFUeF7t3Xl8XFXdP/DP98xkaRooi7S0LNWyFAshTZM7c4/QgoDKpig7qKAP+qgIoqKPoiz6+Pg8IvKIPC74UBcQFCyyyL4IQpFz79ykNUZaylKeIhQK0lJI2ywz5/v7Izf5JYdMMvfOnWw979drXu18z500SWfu955zz/keYmYM1rWc9qph/BACTWDsSUD1kAPGERN6wVgPoD2v8c2qw/jv5jGWZVnW2KDBCUQ/Rt8gwr8TkBpy1ATEAIPwIzqUv2S2WZZlWZU3kEB4OT1BgDQPmOgYeJYW835m3LIsy6osgf6exyRMHgBAwL68nH5hxi3LsqzKom1PYG5NHs9NhmGrkeSBbHox58y4ZVmWVRmiphdXTvbkAQApwtVmzLIsy6ocAYEmMzgpMfY3Q5ZlWVblCDD2NIOT1E7f/jYJM2hZlmVVBvFjGLoQZBLrLWBh1eHcbsYty7Ks5E2pK3aqQtqMWZZlWZUxpRKIZVmWNXZsArEsy7JisQnEsizLimXS3ERnoADgdQCbALwF4C0QNoPxenhI/dZqXDA9yxuMl1qWZVkVMGETCAP/BKCY8Xhe4PbqQ/lp8xjLsixr/EyoBMKE18C4q6cH/1FzJK812y3LsqyJY0IkEAZW5gv4pF3DYU0kQohUNps9m5kPIaIFAPYH8CaAp5j5KSL6o1LqEfN12zMhBDmOc6oQ4ggACwAcAKCr/3cG4H7P8+4yX2dNTuOaQBhozWt8crSNoTY/SjtNFzhYAAdTX8mSnUHYEcCOAHYKJwNsPfJi54VtPamtAP4B4FkArb7vr9Zaj9vPaE1OmUzmkFQq9RMAjWab4ZZ8Pn9hEAQvmA3bGyllI4AfAzjUbDM82Nvbe0Fra+tqs8GaXMYlgTCwsQAcU6x67qpbqHr+LBwlgJMAHAlgbwLIPM506NezrxQ07W6EX2HmhwE8wswP+75vh8YqwHXdq4mowYyPhJkf9TzvW2Z8vEkpTwBwW99uAaNj5s3MvGh7fm9ls9n3CCEeBUpezNudz+ffEwTBCrPBmjzGPIEwsOzfH8bpl13G2mzrfYya0oQLAJxAfT2LSIokkCGYuZWILvd9/zatdcFst+KRUj4GYLEZH8UtSqlTzOB4am5unlNdXd0O4B1m2yhy+Xz+0CAIes2Gqc5xnBnpdPqvAN5pto3imc2bNzevWrXqLbPBmhzGbB0IE7YVgA/QYj7VTB69j1ETP0a3pQltBJwdJ3mUiohaACzLZDKrXNf91Pz582vMY6ztV1VV1Q9iJA8AyKRSqfPN4PYglUpdFiN5AMB+M2bMuNQMWpPHmCQQBjZ19WK/1GJ+YHB8y8M0i5fT79OENiJ8uJRhqqQQ0f5EdO0uu+zyvOu6Z5rt1vaJiKL2ogYQ0RIztp2I/TsDsL3+zqaEiicQBl7cmMLcae/llwbHC4/SyXVV+DsBp4xl4hjGbCK6UUr5h6ampplmo7X9aG5u3g2Iv70BMy8yY1Od4zhVRHSQGY+gQQhR6n0Ta4KpaAJhYM0fNuCdu76HB8Y4X76L6vgx+k1KYBnFGyqolBNra2s7stns0WaDtX1IpVKxkwf6eiCzt8OT4TsA1JrBCKY5jjORzgNWBBVLIAy8/txsNJ58Mg/cqH7zAdpl9xl4kAgfG3r0hDFTCHGnlPJfzAZr6tuwYcNTAPJmPILVWutyXj/pBEHwMvqqRsT1mu/7r5hBa3KoSAJhoKcbaNp3X+7uj3Utp712qMVyAt4z9OgJJw1gqeu6F5sN1tS2bt26bQDKWZvQZga2EyvNQATb6+9sSkg8gTDAmnF07WL+R39s66O0ew2wnAgLhh49YRERfcd13W+bDdaU9xszUCLNzHFfO9mV83NfbwasySPxBALClaklPFDeYd2jVDtN4DYC5g49cOIjoktc1/2oGbemLt/3rwTwkBkfDTN/z/O8h8349kAp9Rtm/q0ZHw0z/1Ip9Tszbk0eiSYQBjbQofzV/udCEO0t8AsC3KFHThpEREtd15VmgzU1aa11Pp8/K+KwzE25XO4yM7g9IaLPMfNjZrwYZr6/UChsl+tmppJEE0iB8cHBz/N/xvkEJLbGgoE8A88y8BAzlmrgEq3xca1xhmZ8pipd+CmAWwAkWZeolohubWho2MVssKamIAhe9n3fAXB+uP9MMau01u9TSp2xvd08Nyml3szlcodrrT8O4GWzfZDntdYneZ53dBAEW81Ga3JJrJQJM/5AS/jk/uddf6K9a6rxJAH1Q4+MjoFXAPx8m8Y1dYdxSTM2Wlpa3l1VVXUmgH8BMMdsj4qZf+F53qfMuNVnqpQyMTU1NU2vqqo6kIgWCCH211q/SURPFQqFp9ra2p6x5XDebt68ebW77rrrAiHEAiHEfGbu7v+dbdu27emOjo4e8zXW5JRIAmGg8NIG7LDnybxtILac/kgY2iOJioGVzPjBU6/ilgUnc6w33bx582pnzpz5BSK6BOUlMy4UCkfkcrk/mw3W1E0glmUVl8wQFuOuwcmjsJxOTCB5XL96A1yxhH8bN3kAwNq1a7s8z/t+WGL6RbM9AkqlUtc4jlNlNliWZW2Pyk4gDPDWGnym/7kQRAKIfUORAdbAJanD8IlyEodJKdXe3d3tRrw5apqfTqfPMIOWZVnbo7KHsJjwFzqUBzaQKTxGx6QI9ww9qjThTfKPicV8s9mWlIaGhvr6+vplAOKWLOnwfb9xIm5SFZaE2FsIMVNr/SqAF4IgKGeVcMnsEJY1FQgh0s3NzXMA7J1Op+sAvNjZ2flCR0dHp3nsRCWl3BHAnlrrOUTUo7XeWCgUNvb09Pwz6ftPZSeQvMDi9CH8eP9zXk4PE/DeoUeVhhn/RUv4G2Y8aY2NjTvX1dU9CWC22Vai45RSJSdJx3HqAEQptPdyEATPmcHBHMepSqfTJwA4i5nnE9GeAOrM4wBsDWelrQVw88aNG29es2bNQIWApEylBJLJZDLMXG3GR1IoFF5csWLF/5lxhDfi0+l0kxkfTSqV6vI8r9WMl2Pu3LnTZs6c2WzGR0NEW3K5XNHeezabXai1jnSPMZVKvep53tNmvBgp5Z75fL7ksvE9PT1Ptre3jzSLrv9ccDaAE9G3Vm1OkU2x/hl+jp5k5qWe55U8ZbmSHMepE0KcSESnE9E+APYAsIN5XKg3HIF5XGv9l/AisyxlJRAGumgxT+t/3vsoLawS8YaIGFjzgsbCuYdxl9lWCdls9iQhxC1mvEQPKqXebwaLcRynIZ1O/82Mj+D3SqnTzCD6vtbe6XT60wDOiZkAX2Xmpcx8je/7A9UCyjWVEoiU8qUYM/cuV0p93Qyir9dbXV9f/zKAqFPBC1u3bt2jvb19g9kQl5TyDACRF/0B+JlS6lwz2E9K2RbxIgnMfJ3neZ8w48W4rvs1IvqeGR/BWUqpYVfJSyldAJ8BcBqAgXNYBO0AfprP528Yj+nIjuNkU6nUJ4jo9HBb73FR7j2QYPCTNOHEwc9LxYAuMD49VskDfSuO/wDgVjNeovdWeF3IPmYAfR+gc9Lp9BoAF8dMHgAwk4i+IYRY67rul81GK3kdHR09zPx7M16CVF1d3YfNYJlOMgOl0FrfYMYmOmZ+2+do3rx5ta7rLgWgAHwiZvIAgEYAP0+n02uz2eyY1fdzHGeGlPKmdDrtEdFnxzN5oNwEwoxrhwQIHxryvFSM/00v4eVmuNLy+fx5AN404yVI19XVHWsGEzTkjT9v3rxaKeW1RLS0zNLZg6WJ6ErXdf9HCJEyG61klXECHlhbVa5wKDXOvb/ngiBQZnCiC4d0BrS0tMydNWvW40R0zuB4mWYJIf7kuu6pZkPSHMfJptPplWGvaUKInUAY0N95BDf2P+9+lN5JfVk5sjzjJ2ZsLARB8DIz32bGS0FE8ZJlaXZyXXdX9PU6dp05c+ZyABVZxEhE52UymdsbGhoijV9b0bS2tj4R3oeK6vD+90K5hBBHA5huxkfDzDdMxEkjJdi3/y+ZTOaQqqqqNgCR7/+UoJaIfue67r+ZDUmRUl6QTqeXA3iX2TaeYicQEF4fvLd5FSHWFTkDa6oO47+b8bHCzH8wY6UgoqMreeWutd5HCEFE9ItwH/eKIaLj6+vrl5pxKzlaa2bmOL2QNBGdYAbjEELEGWJmIhq4UJxk9kHfJIaZqVRqGYBEEnERgogul1J+3GwoV9i7+SGACbcGLX4CAZ4f/IQICwc/jyDWCTwpr7322oMxh7F2yGQybxtjTUoqldonk8mcByCRk0cJTrO7MVYWEd3Qd80UWaz7FoM1NDRUM/PxZrwEvlLqGTM4SezmOM6M2tra68q4ZxjVlUneH81kMk1E9CuM77bfRcVPIBorjEisfZHzveObQNauXdvFzHeb8VIwc6yfuUQnEtEVZrCShBA/mTt3btybitYowhOxb8ZLcJTjODPMYBT19fVHEVGcrxGn1zRhpNPpn8S87xPXbvX19ZebwTjCntPtRabnTwiCgVgLS5gwUBNKCCIABw49YnQMrKs6gs1ENB5i3QcRQlQygZwMoMYMVti82bNn250YKyvOCblaCFFeaSDmOMNXvfl8vmKLesfIeOznc47jOAOLq+Oqqam5BMDeZnwcdAJ4FsDjYbXznzLzt5n5cwIUrz5U51t4oP/vWx/EXgTsOPSIkpS8iKiSiCju9xE5aU50RHTBvHnzkprpZRnCE3KvGR8NEcUexhJCxL2Pcu9YVTKYYiiVSn3NDEaxaNGinYio5DUyRQzco46Lma9RSu2glNpPKbVYKXWKUurznud9y/O8awQ43p7EOx7LAys80+nIi676MBJbIFWOrVu3llQifhjxfu5kJb0PxfRZs2YdaQatZIQn5PvM+GiI6ANxZ8plMpklAN5hxkcT86b/ZJXo54iIjginTcdSXV19Tozq4QUAv2LmDzLz/Hw+X5vP53fTWh/CzJ8z71uXgog+MtJkIdENXMh9/3DJ2LgRSFR06fxo4p64E9XR0fHP8JcfVZxeV7k2AfhvAEvy+fxc3/endXZ27srMh2mtP8/Mvyj3wxDzZqtVoph7p0+rq6s7zgyWgojiDF+98eqrr95pBqeQpwB8kZmdfD6/m+/71fl8fi6A45j5a3G2NTbUCSFiXYgJIVJEdJ4ZH0XAzI1KqX/xPO8uz/OeDoKgNwiCf/q+/4Tnedds3Ljx3Vrri8wXjmKW4zhFS1OJ2sX8Dwa+aTaMiIwTFMU7kTJNjB5IuCnQa2a8BHETZxzMzP+5fv36PZRSFyqllgdB8ILWOt/R0bHR87zHfN//qed5n8rn8+8tp3Q9ER0vhJiQsz6mgldfffVOZt5sxkcTZxhLCCEAfMSMl+CWtWvXjllliLHCzJu11if5vr9AKfUjz/NagyD4p9aagyB4QSl1j+d53/d9//0AvoSY94jR97uPdSHmOM5cACXX/ArrdJ3oed6TZsNga9as6fZ9/3vM/HOzbSQjDX8KABCL+XIGoqwEH5JAiOMlEOiJ0QMJxUlm8X7u6LqY+TTP8765bt26gX1XigmC4PF8Pt8E4AmzrUR7trS0xJ2WbY0iPDFHrsNGRMdEnSXnOI4bZ6i1jJXzE9mzzJz1ff/W0RZGaq1ZKXWV1vpQABvN9hLFvRCbZwZGcb5SquQLxu7u7gsBrDfjxRBR0e9nYBovLeYlGvhqScNZ/LasHHWsDgDAHOuqvyKY+XUzVoLIq3pjusjzvGVmcCThVdUXzXipUqmUY8as5MQcxqqfPXt2pCmpQojIvRYA64IgiHJBORl0FQqFj/i+v8ZsGInv+wEzX23GSzRn4cKFkZN31NXmzPygGRvJypUrt0ScTr6HGeg3ZB2IWMw/6MpjLhNuYsIzDBTrwg7J3lpD5zUVoj6QjpOcK4OIdjZjJRiLKpyP+L4f6w3s+34A4E9mvBTMvJsZs5ITnqBfMOOjiTKMFV79Rh6+YuYbtdZlz+CZYC7J5XJxK178OJzKGlk6nZ5pxkYjhIiSQF7yPC/Oxe+Iw12G0hIIAEx7L79Eh/IZdCjvT4t5GhYzmQ9azENOtosvcrct/no2FfVxyFcyYzUEVIrdzUAJ4qxgj6RQKPxXOR9mrXWU8tcDiMgmkAoK/08jlwhh5uPnz59f0vqg5ubmpqhXs+ibajylhq+YefOGDRt+bMZL5Xne68w8tHBsiVKpVJzPUZTzYtzbAFGG7IsOm74tgcShtY58QzBUydo0JQtvNMb5j650AtnQ2tr6sBmMQmv9aJwZZrYHMiYin6iJaMYuu+xylBkfTiqVKrm3Mkhba2vrajM4yd1R7oQAZn7EjJUizueImaP0TOeH569ImHm+GRtB0X2DIv/DwyGiuPcy9jQD46GxsfEdRXYhG81bZiBhd4YzxGILgqA3zlWK7YFUnlJqFRBrHVZJiSHm9N0492YmuliVJgYTQkQ5qQ+I8zli5nVmbAT1juNEmbEF9H1fJVfRGOn7SSSBFAqFl8xYKYhoPzM2HlKpVJzhKwB42QwkLE7577eJeEXTL/LYrRVL5F4IgBMcxxmxMqvrugcCOMCMjyK/devWm8zgZJfP58v+HHV2dha9Ch9JnB6I1nrYrZGLEUJ83oyNRErZCECa8WKIqLIJpK2t7fmYwzkTYqZPKpUa2DcgCmaOciMqMq11IgmKiOK8+cdyjct2S2t9kzktvgS7pNPpoou7EL/38WCS2+dOFIVCIXIP3NTR0bEx5o30KPczgL73xNqIZUi+JKUsaTuNuXPnTmPmGyPW2XvWDPRLJIGENwSHbG9bondls9m9zOBYE0LE2jaUiOLO6ihVIh9mZk7k61jJ833/FQCRpmGGRhzGilM8cYqWLsm3t7cnVc9rTD5HbW1trwH/v9ZgCQjA713X/faCBQuKXvhlMpn3zZ49+wkiilLDr9Db21t0O+ZEEgj63nxR5hUPdpgZGEsNDQ3VAGJVOs3n8xVNIETUbcbiIKIoVzPWGIt54v5wsRpFjuPsQ0RRF4K+VSgUbjeDU0BvObMYDSMuPkwSM0fdpXU6EV06Y8aM56SUN7uu+13Xdc+RUn5FSvlzKaWXSqUeiPq+YOZ7W1tbKzuEhb5/yDNjpRBCjEe55QF1dXVHxtyYfktbW1vRrp1llaq7u/uOGMMjM1taWhabQfStPYjT+7g1CIKxWNdklSCXy90Tp/hhOJv0VCL6BhEtBXAFgH8FkDUPLAUR/cyMDZZYAunp6YnbA3m/4zjjVvM+ysIswwNa66hj15b1NitXrtzCzLea8dGMsMq8WLyomL0gq0LCXtOPzPgYW+37/oiVoxNLICtXrnw15qwhkUqlvmQGx0Jzc/NuMW82Qmv9RzNmWXHFKW1CRCeaawCklHsCyAyOleClIAhirXOwKsf3/R+XUc+uXJ3MfMpow3+JJRD0fQhiTQEkovMzmUzUN33ZqqqqfgQgTgmTgtb6LjNoWXGFJ/Co0+HnhMUSB4Q3zyPVCGLm35a73shKnta6wMwfG6ub94MwM58zWnVfJJ1AwvGyOMM6qVQqtTS8oT0mpJTHEdEZZrxEy+1ObVaSwhP478z4aIjoZON55B71VCtdMpV4nvd8b2/v+8uoCBwZM//A87yiM68GSzSBKKVeZOa4qz4b6uvrv24GK0FKuSMzj3hzaCTMPN5jk9YU1NvbG3cYiwCgqalpJoCoe3H/rbW19W9m0Jo4tNZvAkhkRuYoupj5glwuV/J2vIkmkFDsomUAvum6bqxNWEoV7vf9ayKKu/7kqVwuZ+9/WIkLT+RRT+ZzHcdpAYDa2toPAxh2au8IIicta+w0NzfvVl1dfT+A2WZbwv6ez+cznuddPdpeKYMlnkA8z3uMmf9qxktUTUS3u657vtmQBNd1d501a9aDcUpc92PmK0e7sWRZZYg8nNQ/GyvG4sFCd3d35GEza2w0NTVNr66uvouI9jfbEvQKM393w4YNThAEHWbjaBJPIOjrVl9uxiJIEdHVUsofFVsoFUdLS8u+RKRidPEHW7tp0yZ7xWZVTHd3929jVE8+qbGxcWciOsJsGMUjK1asiHrj3hoDjuNU1dbWLosxo64UXQB+z8wf9H1/L8/zLo5brbgiCUQpdVPEpfjD+UI2m30om80eFXNbSADAokWLdpJSfqWqqkoBKLd44+fWrFkzFmOR1nYqPKFHnVK7b11d3cUARiywOAx7MTQBCSEolUotBXCM2VbEKgBLAJzNzN9n5uuZ+XYAD4VbJ1+ttb4obD9y69atc5RSp3med1e5a9kqkkDQN7Pj3AR27DtcCPFgNpv9m+u6n4qyH7SUcj/Xdf+npqbmH+FqzHeYx0R0g1Kq3KRoWaOKuajvAjMwii2dnZ2RFy9alZfNZr9PRGeZ8SJWa62PVEotV0pd73ne1zzPO9vzvI8opd6nlDpFKXWB7/vfC9sfbm9v32R+kbgqlkCCIHiOmb9txmM6iIiunTNnzj+klA9KKa91XffibDb7Mdd1l7iue7yU8jwp5RVSymVSylYATxHReXH3azf8s6en58tm0LIq4c0337w1xsVXpOFeZr6jo6MjavkUq8Jc170QwFfMeBFPaa2PCAtyjgtiLvmGe2RCCJHNZm8p56b1BNAL4ANKqajDCgMcx2lIp9NRZ9eAmY/0PK+sHQnR1xu7KsYV6lql1D5msBgp5WMAhq3NNIJnmPluM1gJRLRaKfW/Znw4UsqXAMwx46O4XCmV2DR013VvJKIzzXhStNbH+r5/rxmPS0rZBmCRGR8JM1/ned4nzHgxrut+jYiibtG8TSlVZwbjkFI+AyDS1g/M/GPP80qaFOS67keJ6DcRFoK+BeA3hUJh2bZt257o6OjoMQ+otIr1QBDWc+nq6vo4gJVm22TBzOeWkzysEe1HRF8ciweAWCX7x0vMYaxSvRIEQZwS8laFZDKZw4nolxGSB8I9e85NpVKP1NfXvyml9MLKuxdIKY91HOeAKMP+cVQ0gSAsFKe1PgHAerNtEviB53lLzaBlVVp4gq9ICQtmvqncm6dWslKp1BIA5VTiqAkr7v4rgKsA3J1Op1fPmTNnq5Ryk5RydTj8/xMp5Rez2ezRixYteqdZSy2qsl5cKt/3/9Hb23sYgOfMtgnse77v/5sZtKyxEJ7gY9WWGw0RVbJ3Y8XTawYStFO4vfFRAM4F8EMhxL01NTXPZ7PZzVLKZa7rnuk4zgzzhaMZkwSCvlW2z27duvUQACvMtglGM/MXlFIXRVmRaVkVUIlptquUUm1m0Bpf69evvwpASfWnElYP4GQiujGdTr8qpbzXdd0l5kHFjFkCAYD29vYNmzdvPhzAHWbbBPGG1voUz/P+x2ywrLEWnuhXm/Ey2d7HBLRu3bptvu+fDuAzAN4028dINYCjiejPUsrfhVsDjGhMEwgArFq16i2l1Ie11p9k5s1m+3hh5vsBNPi+b+fGWxNJkid8nc/nbzSD1sSgteZwpuCBAH4ds7J5EgjA6QCeklKOWLF8zBNIP9/3f83MDQASm0oY0yYAn8nlcscopV40Gy1rPPX29t4IIKnaa8uDIHjBDFoTS3geugLAeG8ZMR3AddlstuiK+HFLIAhvriuljg2X4T9ktlfYRma+BMA7lVL/a+93WBNRa2vrOgDLzXgccXY9tMae4ziLADwKYHezbRxUCSGWFdvwb1wTSL9wGf778vn8YgB/iLEKN4pVYV2Yd3me9x9KqfEab7SskiS0JqSrUCjcYgatiSWbze6eTqfvTqD0UpKmp1KpYe8LV3QlelxNTU3Ta2pqjiOikwAcUeYvsxdAB4A7ent7l7W2tiZ9U3JULS0t+6bT6Thlsz/neV6rGYwqLI9wuhkfCRG9pJQqefGdlPJaZl5oxicKInpCKVXSanwp5b3MHOk9R0TXKaXK2QunqEWLFu1UU1NzPzOXc8H3uOd5XzKDSZFS3sDM8834KO72PO9bZrAY13XPBnCeGR8JEXUrpcqpwD1ASnkrM0faR4iIfq+UusKMD0cIkcpkMg9ErKrMYc/yOgDzwoKx7yKiPcJqCrPDNSJl01pnfN8PBscmZAIxhbMBDtZaHyyE2B/ADAA7ho8dmLk7nLnQ/9jAzH8D8Nc33nhjta2ga1nWROe67qlEdLMZH8E2Zv7ESNvPCiHEwoUL966qqjqAiPYnohYAp8ZJKsOVnpkUCcSyLGuqk1IqAK4ZH8FnlVI/N4OjcRxndiqV+rewxE8UryulhvTMbQKxLGtUDQ0Nu3R0dGw041YyXNeVRPSEGS+Gme/yPO+DZjwKKeUNAD5qxkfS1dVVv3Llyi39z8sZU7Usa4pramqaLqW8or6+fryn209pRHSCGRsJM5dUWXokWutSy8YPSKfTQ+4B2QRiWdawstns0bW1tR0AvsLMk6mO3WRU8tYJ6OsJ5MxYVOE+Ii+b8ZEQkU0glmUV19DQUC2l/J0Q4l4Am7TWh3ueV7G9SSwgnEFVKq6rq9tmBmN61QyMJJVKDVkdbxOIZVlDPPnkk3kAjtb6k77vO77vP2oeYyVuphkYASUxZV4IkQawvxkfST6fH9ITtQnESoyUcseGhoYkthC2xpHWWnd2di7wff/XWuukyqhYI3veDIyEiL4rhIi0jbEpm81+FkCUDae62trahpR7srOwxoiU8osAzgHw30qpX5ntpZJSXgng/QBe8H3/+FJKsAghKJvN3gZgH2b+i+d5nzWPicNxnKpUKvURAJ8hokXhvgMIy8QEAK7J5XJ3aq0LxktjCbd5PdiMA9gGYD0z39/d3X394FkicWSz2flCiFuYebXneaea7aXKZrNHCSF+COABpdSFZnsSpJQXAPgUgB8qpX5ptpdDSvkbAAsB3KWUushsL4eU8jvD7BLJzLyJiF5g5ltzudwd5SawTCbTlEqlrmfmNnMNQ7mklP8K4HwAm3zfP7yc79V13aVEdI4ZH8XN3d3dn12xYsUbZsNoXNc9AsCtRBRlD5DVSqkFgwO2BzJ2ZgE4iJl3Mxsi2hvAQQCOdRznRLNxOJlM5jgAJ4Sve6fZHkdzc/OcdDq9nIhuDlfOvgLgHgD3AdhIRB8gotsymczDTU1NUbrnRRHRPuHPMHDVxMwEYC6AE4jop7W1te2LFi0q62cUQtQCOIiIIu1/PYwZ4f95pNXLESX1vhrCcZy9AZwZfu3PVWBr1D3C/8tdAaTDxzQicgB8jIhuzWazf4qzydFgzDw9/HfeZbYl4PPh117sOE6U1eNvQ0RrzFgJTqupqXnSdd2Lm5ub55iNw3EcZx8p5VVEdF/E5AEAt5sBm0AmMSHEZaNtSSmEICL6thkvR2Nj46zq6upcuIXmgwAWKqXerZQ6Til1jFJqv0KhkAWwnIiW1NbWeo2NjTubXycurfUZSqkGpVSD53kHKaVm9fb27hcWoNunpqbGFg0sUzqd/lh4fthCRDPmzJkTaZppBF8P3zvvVkrt5/v+9Hw+7wJoB3B4KpX6qfmCiSCbzS4EcDCALej7nJ1lHhPRKjNQojlE9J3q6uoXXddd47rujVLK70gpv+K67mdd1/2y67rfcl33Oinlk+l0+mkAFwCoMr/QKLrz+fzb6mGNePKxJrQ8gIZMJnOy2TBYJpM5AcCipLbMFEJQXV3dL8MryBt83z9WKdVuHpfL5XL5fP5IALcCeFddXd015jFJam1tfbarq+vU8Oc8NJvNVvKqf3twFgAG8OVBzytOa81BEPj5fP4kAL1EdFo2m50IVWmHIKKz0NfDuTQsn3RiOff/fN+/D8DfzXgEFJYqORPAxQCuIKKfEdGVRHRZ+P0uKOOc/9sgCN425TfuF7PGX3+F1kuL9UJEX/ejv/cR+77LYJlMZjGAYwGs27x587nh3t3DCoKgt7Oz89Ph8NapmUymyTwmSStXrnwVwP+h72dPZNhseySldAHMZ+blvu//Ilwr8L6xPJEHQfAcgDUAUkR0oNk+noQQaSL6KICeLVu2/JqZbwMwffr06SeZx5ZKa13QWn/VjE8QXQB+YAZhE8jkpbW+E0COiA7MZrOnme3o62afCOBgZv5rWCY/Cf1XXteuWrXqLbPR1NHRsZGZr0ffB+/jZnuS5s+fXxP2jAr5fH6d2W6VrP//+AatdYGZbwKQDq9ux1Iiky+SlslkjgYwk5nvCd/fN6CvC1DW+9v3/fvCnVEnEg3g40qpYYfYbAKZxMLuM8JeyJApfUIIwczfQt8b+1vlzBAZjIgOB4BCofBHs62YQqFwJ/pee5jZlpSGhobqnXfe+SoAdQB+EwTBeO/mNimFSfg0AN1dXV23oO//7cbwzzEZxkJfCfs9ABwAIL9t27ZyhnYqYSDBoq+39AiA9QDeG04+iI2ZzwUwkVb9X6iUKrqPjE0gk5jnefcD+AuAAxzHGbJ3cTabPZWIDmTmVt/3Sz7Zj0QIQeEVPtLpdMlX+EKI/mP3MJpiEUJ83XXdn4WPa6SUy+rr658mok8D+NX69evPNV9jlWannXY6HsAuAO5ub2/fhL4N39oArAbQKKVsNF+TtGw2u1d1dfVvw5LjN7e3t28wjxkvjY2NOxPRBwG88dprr92NcPgJwO8AiHQ6Hak4ocn3/bU9PT0SQMmFFSuFmb+vlLrKjA9mE8jkdwn6rg4vCVeWIuyNXIa+N8ElpawVKUVjY2MdgFoABd/3Rx2+6vfWW2/1z1Pf1WiK6wQi+lT4OAfAyeFU3meY+aF169YlVeZhu9M/m8jcBZGZbwz/mnQv5Dwp5TIp5TLXdW+TUrYJIZ4moiXM/Fg+n/+8+YLxVFdXd2r4Gbhl7dq1Xf3xQqGQ2O+nra3ttQ0bNhwJoOg+HxX2PDMf7Xne18wGk00gk5xS6hEAjxDR/plM5qPom+t9Rtj9fyKc3ZGIcIHeVgCphoaG/kWDo6qtre1PHJHq7hSjtZZKqar+R3d3987MfFS4CO1GKeWPzNdYo2tubt4NwDEANm7atOmewW09PT03hrOyzuy/UEnIPuEeGC4RyXDGIAE4I5fLHREEwWbzBeOJmc9G33twSILN5XIrmflJAAcU2z88irVr13b5vn86gOOY+WGzvUIKAP67q6urIRzdGJVNIFNAoVAY6IXMmzevVghxKcLeh3lsuZj5RQCYNm1aydVDq6ur+wvFvWQ0JWLFihVveJ73py1btrwfwLMAvhDOJLIiqK6uPjNcH/DIDjvssFdLS8u+/Y8waXQA2D2bzb7ffG0ZvqSU2ksptdfGjRvnhu+RGq11b1IVDJIipdyPiFwArwkh1g/+/bS0tOxLRH9CgpNFtNaslLrH87wjASwMJ6P0mMclYB0zXwWgWSl1YZRKDjaBTAG5XO4v4eyNfWbNmnVHuC/ynz3Pq8SVywPhnx8x4iP5MPqSz4NmQ5I6Ojo6+2ebMXNZm+1sp/qHX06qqqp6xnyEC+cAIJETpGnNmjXdzHw5+k7C3yo2PX0cnRX2jnYD8PQwv58voO9C7oyGhoZq88XlUEq1e553dldX1y6FQuG9WuuLmPl2AHHuDzGAp5j5P5nZ8X3/XZ7nfWm49VyjmWj/QVZMWutLwzdG/9Vh/wytRPVPySWiT4dDHiNatGjRHuH0Ri4UCmOxQrwHfd9f7EVd26NMJnNQOHz0otb6ouEeAL4R/n5PKLfESDEvv/zy0nDdyUGO45xito+XMJn1J87vmL+bQb+jvwPYdfr06ccaXyIRK1eu3JLL5f7s+/73PM/7iFJq93w+P5eZHa31+wCcwsyfBvBVAN8J/zxba31MPp9vBrBXZ2dnrVLq3Z7nfdPzvNZy7pHaBDJF5HK5HIA7w6cPKKWWG4ckwvf9gJl/C2C36urq6xzHqTOP6bdgwYIdampqbgiLLF4bBMFT5jFJchynKlzkCGbuMNut4gaV4vi17/vfG+6hlPovZr4HwLRUKlWRk/u6deu2MfMV6PueLjOnp4+XlpaWJeFEjRVKqUvN303/Q2t9NcZ4ynMQBC94ntfq+/5DSqlbPM9bqpT6gVLq0vDP633fvy8IghVKqRc7OjoSGwazCWQKyefzX2bmzzHz+WZbkgqFwrkAngJwTDqdXp7NZo8ePNwghEhls9kPzZgx4wkAhwNo7+rq6i+JkTjHcaqklI3pdPoWAM3M/I8tW7bcZB5nDU8IkQpXVr/t5rBpLNaEFAqFn4dDM+82p6ePl1QqNezsNFO4dqYbwHGu6yY163DCsglkCgmC4DnP867xPO9psy1JQRBs7u7ulmGPZ5EQ4t5sNvualLLNdd2VmUzmdSHEHWEl12WdnZ2HRrkxNxohxJ+klJv6H+l0eiuAvwL4EIBn8/n88eH9kAmBiI6RUj5T7OG6bkWu5kuVyWSOAjAHQOD7/ohVYTds2HAXM28O641F2UWvZEEQbAVwJYzp6eMl7GWf3JfbCiNemIRrZ+4GUM3Mw1aImEpsAhk7T4elziNtHGMKy5Lcx8yRbp4x8+vhv99qtsWxYsWKN5RSH9JaHxLeF1kPYD8ieicRrWPmXzCz43neqUmdzJlZhT/DXwB4gx53M/M1AM5Yv379wa2trX8zXxuF1vqt8N8pazEXM78Sfp3Hw9lhxR5vmq8tlda6/3211myLYH74NX5oNpjWrl3bRUSXA7ifiGIvKmTmvwO4T2u93mxD35X8TwHcSURrs9lsi9leqlQqtSn82XyzrVTpdPpgAH9h5quHKyho0lr/DMB9Qog9zbap5v8BjCZS8jfh8VkAAAAASUVORK5CYII=";
const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((ok, fail) => {
    const im = new Image();
    im.onload = () => ok(im);
    im.onerror = fail;
    im.src = src;
  });

function genOnLiving(n: number, logoImg: HTMLImageElement) {
  const RES = 4,
    PAD = 4,
    W_U = 400,
    H_U = 106,
    HALF = 7,
    RZ = 0.16;
  const w = Math.ceil((W_U + PAD * 2) * RES),
    h = Math.ceil((H_U + PAD * 2) * RES);
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext("2d", { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(logoImg, PAD * RES, PAD * RES, W_U * RES, H_U * RES);
  const img = ctx.getImageData(0, 0, w, h).data;
  const NPX = w * h,
    D = new Float32Array(NPX),
    yellow = new Uint8Array(NPX);
  for (let i = 0; i < NPX; i++) {
    D[i] = img[i * 4 + 3] > 127 ? 1e9 : 0;
    yellow[i] = img[i * 4] - img[i * 4 + 2] > 90 ? 1 : 0;
  }
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (!D[i]) continue;
      D[i] = Math.min(D[i], D[i - 1] + 3, D[i - w] + 3, D[i - w - 1] + 4, D[i - w + 1] + 4);
    }
  for (let y = h - 2; y > 0; y--)
    for (let x = w - 2; x > 0; x--) {
      const i = y * w + x;
      if (!D[i]) continue;
      D[i] = Math.min(D[i], D[i + 1] + 3, D[i + w] + 3, D[i + w + 1] + 4, D[i + w - 1] + 4);
    }
  const inside: number[] = [];
  for (let i = 0; i < NPX; i++)
    if (D[i] > 0) {
      D[i] /= 3;
      inside.push(i);
    }

  const S0 = CFG.worldWidth / W_U;
  const Hpx = HALF * RES,
    Hw = HALF * S0,
    slopeK = RZ / Hw;
  const out = { P: new Float32Array(n * 3), N: new Float32Array(n * 3), C: new Float32Array(n * 3) };
  const c = new THREE.Color(),
    nv = new THREE.Vector3();
  let i = 0;
  while (i < n) {
    const idx = inside[(Math.random() * inside.length) | 0];
    const px = idx % w,
      py = (idx / w) | 0;
    const r = Math.max(0, Math.min(0.995, 1 - D[idx] / Hpx)),
      zr = Math.sqrt(1 - r * r);
    const surface = Math.random() < 0.8;
    if (surface && Math.random() > Math.min(1, Math.sqrt(1 + Math.pow((slopeK * r) / zr, 2)) / 6)) continue;
    let gx = (D[idx + 1] - D[idx - 1]) * 0.5,
      gy = (D[idx + w] - D[idx - w]) * 0.5;
    const gl = Math.hypot(gx, gy) || 1;
    gx /= gl;
    gy /= gl;
    const side = Math.random() < 0.5 ? -1 : 1;
    const z = side * RZ * zr * (surface ? 1 : Math.random());
    const u = (px + Math.random()) / RES - PAD,
      v = (py + Math.random()) / RES - PAD;
    out.P.set([(u - W_U / 2) * S0, -(v - H_U / 2) * S0, z], i * 3);
    nv.set((r * -gx) / Hw, (r * gy) / Hw, z / (RZ * RZ)).normalize();
    out.N.set([nv.x, nv.y, nv.z], i * 3);
    if (yellow[idx]) c.copy(COL.yellow).lerp(COL.yellowLight, Math.pow(Math.random(), 1.5) * 0.6);
    else c.copy(COL.white).lerp(COL.blue, Math.random() * 0.5);
    out.C.set([c.r, c.g, c.b], i * 3);
    i++;
  }
  return out;
}

function genNuvion(n: number) {
  const R_PX = 4,
    STEP = 0.25,
    DOT_R_PX = 4.1;
  const line = (x0: number, y0: number, x1: number, y1: number) => {
    const k = Math.max(2, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / STEP));
    return Array.from({ length: k + 1 }, (_, i) => [x0 + ((x1 - x0) * i) / k, y0 + ((y1 - y0) * i) / k]);
  };
  const arc = (cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, dir: number) => {
    const k = Math.ceil((Math.abs(a1 - a0) * Math.max(rx, ry)) / STEP);
    return Array.from({ length: k + 1 }, (_, i) => {
      const a = a0 + ((a1 - a0) * i) / k;
      return [cx + rx * Math.cos(a), cy + dir * ry * Math.sin(a)];
    });
  };
  const circle = (cx: number, cy: number, rx: number, ry: number) =>
    Array.from({ length: 901 }, (_, i) => {
      const a = (i / 900) * Math.PI * 2;
      return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)];
    });
  const join = (...s: number[][][]) => s.flat();
  const V_A = [137.5, 4, 158, 47.5],
    V_B = [158, 47.5, 178.5, 4];
  const PATHS: { pts: number[][]; avoid?: number[][]; closed?: boolean; noStartCap?: boolean }[] = [
    { pts: join(line(3.5, 35, 3.5, 20), arc(22.5, 20, 19, 16, Math.PI, 0, -1), line(41.5, 20, 41.5, 47.5)) },
    { pts: join(line(70.5, 4, 70.5, 31), arc(89.5, 31, 19, 16, Math.PI, 0, 1), line(108.5, 31, 108.5, 4)) },
    { pts: line(V_A[0], V_A[1], V_A[2], V_A[3]), avoid: [V_B] },
    { pts: line(V_B[0], V_B[1], V_B[2], V_B[3]), avoid: [V_A], noStartCap: true },
    { pts: line(206.5, 15.5, 206.5, 47.5) },
    { pts: circle(257, 25.5, 21, 21.5), closed: true },
    { pts: join(line(307.5, 47.5, 307.5, 20), arc(326.5, 20, 19, 16, Math.PI, 0, -1), line(345.5, 20, 345.5, 35)) },
  ];
  const DOTS = [
    [3.5, 47.5],
    [207, 4],
    [345.5, 47.5],
  ];
  const S = CFG.worldWidth / 350;
  const toWorld = (x: number, y: number) => [(x - 175) * S, -(y - 26) * S];
  const R = R_PX * S;

  let total = 0;
  const paths = PATHS.map((P) => {
    const cum = [0];
    for (let i = 1; i < P.pts.length; i++) cum.push(cum[i - 1] + Math.hypot(P.pts[i][0] - P.pts[i - 1][0], P.pts[i][1] - P.pts[i - 1][1]));
    const len = cum[cum.length - 1];
    const capA = P.closed || P.noStartCap ? 0 : R_PX,
      capB = P.closed ? 0 : R_PX;
    total += len + capA + capB;
    return { ...P, avoid: P.avoid || [], cum, len, capA, ext: len + capA + capB };
  });
  const samplePath = (P: (typeof paths)[number], s: number) => {
    const { pts, cum } = P;
    let lo = 0,
      hi = cum.length - 1;
    while (hi - lo > 1) {
      const m = (lo + hi) >> 1;
      if (cum[m] < s) lo = m;
      else hi = m;
    }
    const a = pts[lo],
      b = pts[hi],
      f = (s - cum[lo]) / Math.max(1e-6, cum[hi] - cum[lo]);
    const tx = b[0] - a[0],
      ty = b[1] - a[1],
      tl = Math.hypot(tx, ty) || 1;
    return { x: a[0] + tx * f, y: a[1] + ty * f, tx: tx / tl, ty: ty / tl };
  };
  const insideSeg = (px: number, py: number, z: number, [x0, y0, x1, y1]: number[]) => {
    const dx = x1 - x0,
      dy = y1 - y0,
      t = ((px - x0) * dx + (py - y0) * dy) / (dx * dx + dy * dy);
    if (t < 0 || t > 1) return false;
    const d = Math.hypot(px - (x0 + dx * t), py - (y0 + dy * t)) * S;
    return (d / R) ** 2 + (z / R) ** 2 < 1.02;
  };

  const out = { P: new Float32Array(n * 3), N: new Float32Array(n * 3), C: new Float32Array(n * 3) };
  const c = new THREE.Color(),
    nv = new THREE.Vector3();
  let i = 0;
  const put = (x: number, y: number, z: number, nx: number, ny: number, nz: number, col: THREE.Color) => {
    out.P.set([x, y, z], i * 3);
    nv.set(nx, ny, nz).normalize();
    out.N.set([nv.x, nv.y, nv.z], i * 3);
    out.C.set([col.r, col.g, col.b], i * 3);
    i++;
  };
  const dotsEach = Math.round((n * 0.038) / 3);
  const nLetters = n - dotsEach * 3;
  while (i < nLetters) {
    let s = Math.random() * total,
      P = paths[0];
    for (const p of paths) {
      if (s <= p.ext) {
        P = p;
        break;
      }
      s -= p.ext;
    }
    let s0 = s - P.capA,
      along = 0;
    if (s0 < 0) {
      along = s0;
      s0 = 0;
    } else if (s0 > P.len) {
      along = s0 - P.len;
      s0 = P.len;
    }
    const q = samplePath(P, s0);
    const a = along / R_PX,
      rho = Math.sqrt(Math.max(0, 1 - a * a));
    const nx2 = -q.ty,
      ny2 = q.tx,
      th = Math.random() * Math.PI * 2,
      rr = shellR();
    const cx = Math.cos(th) * rho,
      sz = Math.sin(th) * rho;
    const ux = q.tx * a + nx2 * cx,
      uy = q.ty * a + ny2 * cx;
    const ox = ux * rr * R_PX,
      oy = uy * rr * R_PX,
      oz = sz * R * rr;
    if (P.avoid.length && P.avoid.some((sg) => insideSeg(q.x + ox, q.y + oy, oz, sg))) continue;
    const [wx, wy] = toWorld(q.x + ox, q.y + oy);
    put(wx, wy, oz, ux, -uy, sz, c.copy(COL.white).lerp(COL.blue, Math.random() * 0.5));
  }
  for (const [x, y] of DOTS) {
    const [wx, wy] = toWorld(x, y),
      r = DOT_R_PX * S;
    for (let k = 0; k < dotsEach; k++) {
      const th = Math.random() * Math.PI * 2,
        uz = Math.random() * 2 - 1,
        rq = Math.sqrt(1 - uz * uz);
      const ux = rq * Math.cos(th),
        uy = rq * Math.sin(th),
        rr = shellR();
      put(wx + ux * r * rr, wy + uy * r * rr, uz * r * rr, ux, uy, uz, c.copy(COL.orange).offsetHSL((Math.random() - 0.5) * 0.03, 0, (Math.random() - 0.5) * 0.1));
    }
  }
  return out;
}

function buildGeometry(n: number, logoImg: HTMLImageElement) {
  const A = genOnLiving(n, logoImg),
    B = genNuvion(n);
  const order = (src: { P: Float32Array }) =>
    Array.from({ length: n }, (_, k) => k)
      .map((k) => [src.P[k * 3] + gauss() * 0.12, k])
      .sort((a, b) => a[0] - b[0])
      .map((e) => e[1]);
  const oA = order(A),
    oB = order(B);

  const pos = new Float32Array(n * 3),
    nor = new Float32Array(n * 3),
    col = new Float32Array(n * 3);
  const posB = new Float32Array(n * 3),
    norB = new Float32Array(n * 3),
    colB = new Float32Array(n * 3);
  const rand = new Float32Array(n * 4);
  const size = new Float32Array(n),
    type = new Float32Array(n);

  for (let k = 0; k < n; k++) {
    const a = oA[k] * 3,
      b = oB[k] * 3,
      d = k * 3;
    for (let j = 0; j < 3; j++) {
      pos[d + j] = A.P[a + j];
      nor[d + j] = A.N[a + j];
      col[d + j] = A.C[a + j];
      posB[d + j] = B.P[b + j];
      norB[d + j] = B.N[b + j];
      colB[d + j] = B.C[b + j];
    }
    type[k] = Math.random() < CFG.shedRatio ? 4 : 0;
    size[k] = 1.6 + Math.random() * 1.6;
    rand.set([Math.random(), Math.random(), Math.random(), Math.random()], k * 4);
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  g.setAttribute("aPosB", new THREE.BufferAttribute(posB, 3));
  g.setAttribute("aNorB", new THREE.BufferAttribute(norB, 3));
  g.setAttribute("aColB", new THREE.BufferAttribute(colB, 3));
  g.setAttribute("aRand", new THREE.BufferAttribute(rand, 4));
  g.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
  g.setAttribute("aType", new THREE.BufferAttribute(type, 1));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 50);
  return g;
}

const vertexShader = /* glsl */ `
  uniform float uTime, uPixelRatio, uMix;
  uniform vec3 uLightDir;
  attribute vec4 aOffset;
  attribute vec3 aPosB, aNorB, aColB;
  attribute vec4 aRand;
  attribute float aSize, aType;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float t = uTime;

    float m = clamp(uMix * 1.5 - aRand.w * 0.5, 0.0, 1.0);
    m = m * m * (3.0 - 2.0 * m);
    float mid = sin(3.14159 * m);
    vec3 base = mix(position, aPosB, m);
    vec3 nrm = normalize(mix(normal, aNorB, m) + vec3(0.0, 0.0, 1e-3));
    vec3 col = mix(color, aColB, m);

    vec3 dir = normalize(aRand.xyz - 0.5 + 1e-3);
    base += (dir * ${CFG.swirl.toFixed(2)} + vec3(0.0, 0.0, (aRand.y - 0.5) * 1.2)) * mid;

    vec3 ph = aRand.xyz * 6.2831;
    vec3 wave = vec3(
      sin(t * 0.35 + base.y * 1.7 + ph.x) + 0.5 * sin(t * 0.81 + base.x * 2.3 + ph.y),
      cos(t * 0.30 + base.x * 1.3 + ph.y) + 0.5 * cos(t * 0.67 + base.z * 2.9 + ph.z),
      sin(t * 0.25 + base.x * 0.9 + base.y * 1.1 + ph.z)
    );
    vec3 p = base + wave * (0.008 + 0.12 * mid);

    p += aOffset.xyz;
    bool detached = aOffset.w < 0.995;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uPixelRatio * (12.0 / -mv.z);

    vec3 n = normalize(normalMatrix * nrm);
    vec3 L = normalize(uLightDir);
    float diff = max(dot(n, L), 0.0);
    float spec = pow(max(dot(reflect(-L, n), vec3(0.0, 0.0, 1.0)), 0.0), 18.0);
    float rim = pow(1.0 - abs(n.z), 2.5);
    float light = 0.6 + 0.8 * diff + 0.5 * spec + 0.3 * rim;
    float facing = smoothstep(-0.45, 0.2, n.z);
    if (detached) { facing = 1.0; light = max(light, 0.9); }
    facing = mix(facing, 1.0, mid);

    vColor = col * light * 1.15;
    float twinkle = 0.85 + 0.15 * sin(t * 1.7 + aRand.z * 40.0);
    vAlpha = 0.95 * twinkle * aOffset.w * mix(0.14, 1.0, facing);
  }
`;
const fragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float a = pow(1.0 - d * 2.0, 1.2);
    gl_FragColor = vec4(vColor, a * vAlpha);
  }
`;

export async function initOnLivingMorph(canvas: HTMLCanvasElement, container: HTMLElement, reduced: boolean) {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: "high-performance" });
  } catch {
    canvas.style.display = "none";
    return;
  }

  let logoImg: HTMLImageElement;
  try {
    logoImg = await loadImage(LOGO_SRC);
  } catch {
    canvas.style.display = "none";
    return;
  }

  // Volta a ser o mais fiel possível ao arquivo de referência original (mesma contagem, mesmo pixelRatio, sem
  // nenhum fator de escala extra no desktop) — as tentativas de "melhorar" tamanho/nitidez do ponto só
  // pioraram a comparação direta. No mobile mantém a contagem menor (custo de CPU da física por partícula) e
  // a compensação de tamanho (a faixa 16:9 fixa aproxima a câmera, o que não existe no arquivo original).
  const small = container.clientWidth < 520;
  const n = small ? 15000 : 46000;
  const pixelRatio = Math.min(window.devicePixelRatio, 2);
  const sizeScale = small ? 0.68 : 1;
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(container.clientWidth, container.clientHeight);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, container.clientWidth / container.clientHeight, 0.1, 100);
  const uniforms = {
    uTime: { value: 0 },
    uPixelRatio: { value: pixelRatio * sizeScale },
    uLightDir: { value: new THREE.Vector3(-0.45, 0.6, 0.7) },
    uMix: { value: 0 },
  };
  const geometry = buildGeometry(n, logoImg);
  const points = new THREE.Points(
    geometry,
    new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  scene.add(points);
  // No mobile a faixa é baixa (16:9 fixo) e o texto vem logo abaixo dela — sem isso a logo (centrada por
  // padrão) ficava colada/sobrepondo o título. Desloca só o conteúdo pra cima dentro do próprio quadro
  // (a rotação continua em torno do centro local do objeto, então não muda o giro).
  if (small) points.position.y = 0.3;

  const physics = (() => {
    const N = geometry.attributes.position.count;
    const PA = geometry.attributes.position.array as Float32Array,
      PB = geometry.attributes.aPosB.array as Float32Array;
    const NA = geometry.attributes.normal.array as Float32Array,
      NB = geometry.attributes.aNorB.array as Float32Array;
    const TYP = geometry.attributes.aType.array as Float32Array;
    const offArr = new Float32Array(N * 4);
    for (let i = 0; i < offArr.length; i += 4) offArr[i + 3] = 1;
    const offAttr = new THREE.BufferAttribute(offArr, 4).setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute("aOffset", offAttr);
    const vel = new Float32Array(N * 3);
    const k = new Float32Array(N),
      maxD = new Float32Array(N);
    const life = new Float32Array(N),
      lifeRate = new Float32Array(N),
      det = new Uint8Array(N);
    for (let i = 0; i < N; i++) {
      k[i] = CFG.springMin + Math.random() * (CFG.springMax - CFG.springMin);
      maxD[i] = CFG.wobbleMax * (0.4 + Math.random() * 0.6);
    }

    function step(dt: number, ax: number, ay: number, az: number, mixv: number) {
      if (dt <= 0) return;
      const wx = ax / dt,
        wy = ay / dt,
        wz = az / dt;
      const motion = Math.min(1, Math.hypot(wx, wy, wz) / CFG.shedOmega);
      const pDetach = 0.9 * motion * CFG.shedAmount * dt;
      const springDecay = Math.exp(-CFG.springDamping * dt),
        airDecay = Math.exp(-CFG.airDrag * dt);
      const mb = mixv,
        ma = 1 - mixv;

      for (let i = 0; i < N; i++) {
        const i3 = i * 3,
          i4 = i * 4;
        const px = PA[i3] * ma + PB[i3] * mb,
          py = PA[i3 + 1] * ma + PB[i3 + 1] * mb,
          pz = PA[i3 + 2] * ma + PB[i3 + 2] * mb;
        let dx = offArr[i4],
          dy = offArr[i4 + 1],
          dz = offArr[i4 + 2];
        let vx = vel[i3],
          vy = vel[i3 + 1],
          vz = vel[i3 + 2];
        const x = px + dx,
          y = py + dy,
          z = pz + dz;
        dx -= ay * z - az * y;
        dy -= az * x - ax * z;
        dz -= ax * y - ay * x;

        if (det[i]) {
          const tvx = vx - (ay * vz - az * vy),
            tvy = vy - (az * vx - ax * vz),
            tvz = vz - (ax * vy - ay * vx);
          vx = tvx * airDecay + (Math.random() - 0.5) * 0.5 * dt;
          vy = tvy * airDecay + (CFG.buoyancy + (Math.random() - 0.5) * 0.5) * dt;
          vz = tvz * airDecay + (Math.random() - 0.5) * 0.5 * dt;
          dx += vx * dt;
          dy += vy * dt;
          dz += vz * dt;
          life[i] -= lifeRate[i] * dt;
          if (life[i] <= 0) {
            det[i] = 0;
            dx = dy = dz = vx = vy = vz = 0;
            offArr[i4 + 3] = 0;
          } else {
            const l = life[i];
            offArr[i4 + 3] = Math.min(0.99, l * 6) * Math.pow(l, 0.8) * 0.99;
          }
        } else {
          vx = (vx - k[i] * dx * dt) * springDecay;
          vy = (vy - k[i] * dy * dt) * springDecay;
          vz = (vz - k[i] * dz * dt) * springDecay;
          dx += vx * dt;
          dy += vy * dt;
          dz += vz * dt;
          const len = Math.hypot(dx, dy, dz),
            lim = maxD[i];
          if (len > lim) {
            const s = lim / len;
            dx *= s;
            dy *= s;
            dz *= s;
            vx *= 0.6;
            vy *= 0.6;
            vz *= 0.6;
          }
          offArr[i4 + 3] = Math.min(1, offArr[i4 + 3] + dt * 1.5);
          if (TYP[i] > 3.5 && offArr[i4 + 3] >= 1 && Math.random() < pDetach) {
            det[i] = 1;
            life[i] = 1;
            lifeRate[i] = 1 / (1.2 + Math.random() * 2.2);
            const carry = 0.25 + Math.random() * 0.55,
              push = 0.12 + Math.random() * 0.3;
            const nx = NA[i3] * ma + NB[i3] * mb,
              ny = NA[i3 + 1] * ma + NB[i3 + 1] * mb,
              nz = NA[i3 + 2] * ma + NB[i3 + 2] * mb;
            vx = (wy * z - wz * y) * carry + nx * push;
            vy = (wz * x - wx * z) * carry + ny * push;
            vz = (wx * y - wy * x) * carry + nz * push;
            offArr[i4 + 3] = 0.99;
          }
        }
        offArr[i4] = dx;
        offArr[i4 + 1] = dy;
        offArr[i4 + 2] = dz;
        vel[i3] = vx;
        vel[i3 + 1] = vy;
        vel[i3 + 2] = vz;
      }
      offAttr.needsUpdate = true;
    }
    return { step };
  })();

  function fitCamera() {
    const w = container.clientWidth,
      h = container.clientHeight || 1;
    const aspect = w / h;
    camera.aspect = aspect;
    const dist = (CFG.worldWidth * 0.66) / (Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * aspect);
    camera.position.set(0, 0, Math.max(11, dist));
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  fitCamera();
  const ro = new ResizeObserver(() => fitCamera());
  ro.observe(container);

  const ndc = new THREE.Vector2(0, 0);
  let pointerActive = false,
    lastMove = -10;
  let target = 0,
    holdT = 0;
  function setPointer(e: PointerEvent) {
    const rect = container.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    ndc.set(Math.max(-1, Math.min(1, nx)), Math.max(-1, Math.min(1, ny)));
    pointerActive = true;
    lastMove = clock.elapsedTime;
  }
  window.addEventListener("pointermove", setPointer);
  canvas.addEventListener("pointerdown", (e) => {
    setPointer(e);
    target = 1 - target;
    holdT = 0;
  });
  document.addEventListener("pointerleave", () => {
    pointerActive = false;
  });
  window.addEventListener("blur", () => {
    pointerActive = false;
  });

  const clock = new THREE.Clock();
  const rot = { yaw: 0, pitch: 0 };
  const euler = new THREE.Euler(0, 0, 0, "YXZ");
  const qCurr = new THREE.Quaternion(),
    qPrev = new THREE.Quaternion(),
    qrel = new THREE.Quaternion();

  let raf = 0;
  let running = false;
  function tick() {
    if (!running) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    uniforms.uTime.value = t;

    const mixv = uniforms.uMix.value;
    if (mixv === target) {
      holdT += dt;
      if (holdT >= CFG.hold) {
        target = 1 - target;
        holdT = 0;
      }
    }
    const stepM = dt / CFG.morphDuration;
    uniforms.uMix.value = target > mixv ? Math.min(target, mixv + stepM) : Math.max(target, mixv - stepM);

    const idle = reduced || !pointerActive || t - lastMove > 4;
    const tyaw = idle ? (reduced ? 0 : Math.sin(t * 0.22) * 0.3) : ndc.x * CFG.maxRotY;
    const tpitch = idle ? (reduced ? 0 : Math.sin(t * 0.17) * 0.06) : -ndc.y * CFG.maxRotX;
    const k = 1 - Math.pow(idle ? 0.3 : CFG.rotSmooth, dt);
    rot.yaw += (tyaw - rot.yaw) * k;
    rot.pitch += (tpitch - rot.pitch) * k;
    euler.set(rot.pitch, rot.yaw, 0);
    qPrev.copy(qCurr);
    qCurr.setFromEuler(euler);
    points.quaternion.copy(qCurr);

    qrel.copy(qCurr).invert().multiply(qPrev);
    const s = qrel.w < 0 ? 2 : -2;
    const mm = uniforms.uMix.value;
    physics.step(dt, qrel.x * s, qrel.y * s, qrel.z * s, mm * mm * (3 - 2 * mm));

    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  }
  function start() {
    if (running) return;
    running = true;
    clock.start();
    raf = requestAnimationFrame(tick);
  }
  function stop() {
    running = false;
    cancelAnimationFrame(raf);
  }

  const io = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) start();
      else stop();
    },
    { threshold: 0.05 },
  );
  io.observe(container);
}
