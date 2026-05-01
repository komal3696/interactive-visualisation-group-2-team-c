const width = 1000, height = 500;
const margin = { top: 20, right: 40, bottom: 50, left: 60 };

const svg = d3.select("#chart").append("svg")
  .attr("width", width)
  .attr("height", height);

const chart = svg.append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

const tooltip = d3.select("#tooltip");

let fullData, x, y, mData, lData;

d3.csv("churnn.csv").then(data => {

  data.forEach(d => {
    d.tenure = +d.tenure;
    d.TotalCharges = +d.TotalCharges;
  });

  fullData = data;
  update(60);
});

function update(maxTenure) {

  const filtered = fullData.filter(d => d.tenure <= maxTenure);

  d3.select("#tenureValue").text(maxTenure);
  d3.select("#totalCustomers").text(filtered.length);
  d3.select("#avgCLV").text(Math.round(d3.mean(filtered, d => d.TotalCharges)));

  const group = d =>
    d3.rollups(d, v => d3.mean(v, d => d.TotalCharges), d => d.tenure)
      .map(([t, v]) => ({ tenure: t, value: v }))
      .sort((a,b)=>a.tenure-b.tenure);

  mData = group(filtered.filter(d=>d.Contract==="Month-to-month"));
  lData = group(filtered.filter(d=>d.Contract!=="Month-to-month"));

  x = d3.scaleLinear()
    .domain([0,maxTenure])
    .range([0,width-margin.left-margin.right]);

  y = d3.scaleLinear()
    .domain([0,d3.max([...mData,...lData],d=>d.value)])
    .range([height-margin.top-margin.bottom,0]);

  chart.selectAll("*").remove();

  // AXIS
  chart.append("g")
    .attr("transform",`translate(0,${height-margin.top-margin.bottom})`)
    .call(d3.axisBottom(x));

  chart.append("g").call(d3.axisLeft(y));

  const line = d3.line()
    .x(d=>x(d.tenure))
    .y(d=>y(d.value))
    .curve(d3.curveMonotoneX);

  // LINE ANIMATION
  function drawLine(data, color) {
    const path = chart.append("path")
      .datum(data)
      .attr("fill","none")
      .attr("stroke",color)
      .attr("stroke-width",3)
      .attr("d",line);

    const length = path.node().getTotalLength();

    path
      .attr("stroke-dasharray", length)
      .attr("stroke-dashoffset", length)
      .transition()
      .duration(1200)
      .attr("stroke-dashoffset", 0);
  }

  drawLine(mData, "#22c55e");
  drawLine(lData, "#ef4444");

  // HOVER LINE
  const focusLine = chart.append("line")
    .attr("class","focus-line")
    .attr("y1",0)
    .attr("y2",height-margin.top-margin.bottom)
    .style("opacity",0);

  // INTERACTION
  svg.append("rect")
    .attr("transform",`translate(${margin.left},${margin.top})`)
    .attr("width",width-margin.left-margin.right)
    .attr("height",height-margin.top-margin.bottom)
    .attr("fill","transparent")

    .on("mousemove",(event)=>{

      const [mx] = d3.pointer(event);
      const t = Math.round(x.invert(mx - margin.left));

      const d1 = mData.find(d=>d.tenure===t);
      const d2 = lData.find(d=>d.tenure===t);

      if(!d1 || !d2) return;

      focusLine
        .attr("x1",x(t))
        .attr("x2",x(t))
        .style("opacity",1);

      tooltip.style("opacity",1)
        .html(`
          <b>Month ${t}</b><br>
          Month-to-month: ${d1.value.toFixed(0)}<br>
          Long-term: ${d2.value.toFixed(0)}
        `)
        .style("left",(event.pageX+15)+"px")
        .style("top",(event.pageY-20)+"px");
    })

    .on("click",(event)=>{

      const [mx] = d3.pointer(event);
      const t = Math.round(x.invert(mx - margin.left));

      const d1 = mData.find(d=>d.tenure===t);
      const d2 = lData.find(d=>d.tenure===t);

      if(!d1 || !d2) return;

      const diff = d2.value - d1.value;
      const percent = ((diff/d1.value)*100).toFixed(1);

      let insight;

      if(diff > 0){
        insight = `🚀 Long-term customers outperform by ${percent}% at month ${t}. Retention strategy is working.`;
      } else {
        insight = ` Month-to-month customers dominate at month ${t}. Consider improving long-term engagement.`;
      }

      d3.select("#insightText").html(insight);
    })

    .on("mouseout",()=>{
      tooltip.style("opacity",0);
      focusLine.style("opacity",0);
    });
}

// SLIDER
d3.select("#tenureSlider").on("input",function(){
  update(+this.value);
});