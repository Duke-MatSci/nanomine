function find_subcell(filepath,cellsize)
load(filepath)
[L,~,~]=size(img);
VF = sum(img(:))/L^3;
while 1
    v=randi([1,L-cellsize+1],1,3);
    x=v(1);
    y=v(2);
    z=v(3);
    testCell = img(x:x+cellsize-1, y: y+cellsize -1, z:z+cellsize -1);
    vf_test = sum(testCell(:))/cellsize^3;
    if abs(vf_test-VF)/VF <=0.05
        Bimg = testCell;
        save('selCell.mat','Bimg')
        break;
    end
end
end