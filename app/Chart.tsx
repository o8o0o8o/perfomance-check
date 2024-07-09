"use client";
import { axisBottom, axisLeft, line, scaleLinear, select, selectAll } from "d3";
import { Fragment, useEffect, useRef, useState } from "react";

const Selector = ({
  label,
  type,
  value,
  onChange,
  json,
}: {
  label: string;
  type: "network" | "cpu" | "device" | "metric";
  value: string;
  onChange: (val: any) => void;
  json: any;
}) => {
  let path = json;

  switch (type) {
    case "cpu":
      path = json.fast3g;
      break;
    case "device":
      path = json.fast3g.normal;
      break;
    case "metric":
      path = json.fast3g.normal.desktop;
      break;
    case "network":
    default:
      path = json;
      break;
  }

  return (
    <>
      <label htmlFor={type} style={{ margin: "0 8px" }}>
        {label}:{" "}
      </label>
      <select name={type} id={type} value={value} onChange={onChange}>
        {Object.keys(path).map((key) => (
          <option value={key} key={key}>
            {key}
          </option>
        ))}
      </select>
    </>
  );
};

const Controls = ({
  color,
  label,
  setNetwork,
  setCPU,
  setDevice,
  setMetric,
  network,
  CPU,
  device,
  metric,
  json,
}: any) => (
  <div>
    <div style={{ color }}>{label}</div>
    <Selector
      label="network throttle"
      type="network"
      value={network}
      onChange={setNetwork}
      json={json}
    />
    <Selector
      label="cpu slowdown"
      type="cpu"
      value={CPU}
      onChange={setCPU}
      json={json}
    />
    <Selector
      label="device"
      type="device"
      value={device}
      onChange={setDevice}
      json={json}
    />
    <Selector
      label="metric"
      type="metric"
      value={metric}
      onChange={setMetric}
      json={json}
    />
  </div>
);

function getRandomColor() {
  var letters = "0123456789ABCDEF";
  var color = "#";
  for (var i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

const SingleTest = ({ json, svg, calcNode }: any) => {
  const [color] = useState(getRandomColor());

  const [aNetwork, setANetwork] = useState<keyof typeof json>("normal");
  const [aCPU, setACPU] = useState<keyof typeof json.fast3g>("normal");

  const [aDevice, setADevice] =
    useState<keyof typeof json.fast3g.cpu4x>("desktop");

  const [aMetric, setAMetric] =
    useState<keyof typeof json.fast3g.cpu4x.desktop>("LCP");

  useEffect(() => {
    const svgElement = select(svg.current);

    const draw = (svgElement, test) => {
      const nodes = calcNode(test);

      for (let i = 0; i < nodes.length; i++) {
        svgElement
          .append("circle")
          .attr("cx", nodes[i][0])
          .attr("cy", nodes[i][1])
          .attr("r", 4)
          .attr("fill", color);
      }

      svgElement
        .append("path")
        .attr("d", line()(nodes))
        .attr("stroke", color)
        .attr("marker-end", "url(#dot)")
        .attr("fill", "none");
    };

    draw(svgElement, json[aNetwork][aCPU][aDevice][aMetric]);

    return () => {
      selectAll(`[stroke="${color}"]`).remove();
      selectAll(`[fill="${color}"]`).remove();
    };
  }, [aCPU, aDevice, aMetric, aNetwork, calcNode, color, json, svg]);

  return (
    <Controls
      color={color}
      label={json.page}
      setNetwork={(e) => {
        setANetwork(e.target.value);
      }}
      setCPU={(e) => {
        setACPU(e.target.value);
      }}
      setDevice={(e) => {
        setADevice(e.target.value);
      }}
      setMetric={(e) => {
        setAMetric(e.target.value);
      }}
      network={aNetwork}
      CPU={aCPU}
      device={aDevice}
      metric={aMetric}
      json={json}
    />
  );
};

export default function Chart({
  results,
  audits,
}: {
  results: any[];
  audits: {};
}) {
  const ref = useRef<SVGSVGElement>(null);
  const width = 1000;
  const height = 800;
  const xOffset = 50;
  const yOffset = 10;

  const xScale = scaleLinear()
    .domain([
      0,
      Math.max(
        ...results.map((result) => result.normal.normal.mobile.FCP.length)
      ),
    ])
    .range([0, width - 100]);

  const yScale = scaleLinear()
    .domain([
      0,
      1.1 *
        Math.max(
          ...results.map((result) =>
            Math.max(...result.slow3g.cpu6x.mobile.LCP)
          )
        ),
    ])
    .range([height / 2, 0]);

  const calcNode = (test) =>
    test.map((y, x) => [xScale(x) + xOffset, yScale(y) + yOffset]);

  useEffect(() => {
    const svgElement = select(ref.current);
    const xAxis = axisBottom(xScale);
    const yAxis = axisLeft(yScale);
    svgElement
      .append("g")
      .attr("transform", `translate(${xOffset}, ${yOffset})`)
      .call(yAxis);

    const xAxisTranslate = height / 2 + 10;

    svgElement
      .append("g")
      .attr("transform", `translate(${xOffset}, ${xAxisTranslate})`)
      .call(xAxis);

    return () => selectAll("svg > *").remove();
  }, [results, xScale, yScale]);

  return (
    <>
      <form>
        {results.map((result, index) => (
          <Fragment key={index}>
            <SingleTest
              json={result}
              xOffset={xOffset}
              yOffset={yOffset}
              svg={ref}
              calcNode={calcNode}
            />
            <br />
          </Fragment>
        ))}
      </form>
      <svg ref={ref} width={width} height={height} />
      <div className="w-full">{JSON.stringify(audits, null, 2)}</div>
    </>
  );
}
